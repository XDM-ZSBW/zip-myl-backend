const logger = require('../utils/logger');

/**
 * Rate Limiting Middleware
 * Implements comprehensive rate limiting for security
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = 60 * 1000; // 1 minute

    // Start cleanup interval
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Check rate limit for a given key
   */
  checkLimit(key, windowMs, maxRequests) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key);

    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: validRequests[0] + windowMs,
        retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000),
      };
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return {
      allowed: true,
      remaining: maxRequests - validRequests.length,
      resetTime: now + windowMs,
      retryAfter: 0,
    };
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxAge);

      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    return {
      totalKeys: this.requests.size,
      totalRequests: Array.from(this.requests.values()).reduce((sum, requests) => sum + requests.length, 0),
      memoryUsage: process.memoryUsage().heapUsed,
    };
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 */
const rateLimit = (action, options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute
    max = 5000, // 5000 requests per window (increased from 100)
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return (req, res, next) => {
    try {
      const key = `${action}:${keyGenerator(req)}`;
      const result = rateLimiter.checkLimit(key, windowMs, max);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);

        logger.warn(`Rate limit exceeded for ${action}`, {
          key,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          retryAfter: result.retryAfter,
        });

        return res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          resetTime: new Date(result.resetTime).toISOString(),
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

/**
 * Device-specific rate limiting
 */
const deviceRateLimit = (action, options = {}) => {
  return rateLimit(action, {
    ...options,
    keyGenerator: (req) => {
      // Use device ID if available, otherwise fall back to IP
      return req.deviceId || req.ip;
    },
  });
};

/**
 * IP-based rate limiting
 */
const ipRateLimit = (action, options = {}) => {
  return rateLimit(action, {
    ...options,
    keyGenerator: (req) => req.ip,
  });
};

/**
 * User-based rate limiting
 */
const userRateLimit = (action, options = {}) => {
  return rateLimit(action, {
    ...options,
    keyGenerator: (req) => {
      // Use user ID if available, otherwise fall back to device ID or IP
      return req.userId || req.deviceId || req.ip;
    },
  });
};

/**
 * Strict rate limiting for sensitive operations
 */
const strictRateLimit = (action, options = {}) => {
  return rateLimit(action, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 500, // 500 requests per hour (increased from 5)
    ...options,
  });
};

/**
 * Burst rate limiting for high-frequency operations
 */
const burstRateLimit = (action, options = {}) => {
  return rateLimit(action, {
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // 10000 requests per minute (increased from 1000)
    ...options,
  });
};

/**
 * Rate limiting presets for common operations
 */
const rateLimitPresets = {
  // Device registration - very strict
  deviceRegistration: strictRateLimit('device_registration', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
  }),

  // Pairing code generation - moderate
  pairingCode: rateLimit('pairing_code', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200,
  }),

  // Device pairing - strict
  devicePairing: strictRateLimit('device_pairing', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
  }),

  // Key exchange - moderate
  keyExchange: rateLimit('key_exchange', {
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
  }),

  // Trust operations - moderate
  trustOperations: rateLimit('trust_operations', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 2000,
  }),

  // API calls - generous
  apiCalls: burstRateLimit('api_calls', {
    windowMs: 60 * 1000, // 1 minute
    max: 10000,
  }),

  // Authentication - strict
  authentication: strictRateLimit('authentication', {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,
  }),

  // Health checks - very generous
  healthChecks: burstRateLimit('health_checks', {
    windowMs: 60 * 1000, // 1 minute
    max: 10000,
  }),
};

/**
 * Get rate limit status for a key
 */
const getRateLimitStatus = (action, key) => {
  const fullKey = `${action}:${key}`;
  const requests = rateLimiter.requests.get(fullKey) || [];
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute default
  const max = 100; // default max

  const validRequests = requests.filter(timestamp => timestamp > now - windowMs);

  return {
    key: fullKey,
    requests: validRequests.length,
    max,
    remaining: Math.max(0, max - validRequests.length),
    resetTime: validRequests.length > 0 ? validRequests[0] + windowMs : now + windowMs,
  };
};

/**
 * Clear rate limit for a key
 */
const clearRateLimit = (action, key) => {
  const fullKey = `${action}:${key}`;
  rateLimiter.requests.delete(fullKey);
  logger.info(`Rate limit cleared for ${fullKey}`);
};

/**
 * Get rate limiting statistics
 */
const getRateLimitStats = () => {
  return rateLimiter.getStats();
};

module.exports = {
  rateLimit,
  deviceRateLimit,
  ipRateLimit,
  userRateLimit,
  strictRateLimit,
  burstRateLimit,
  rateLimitPresets,
  getRateLimitStatus,
  clearRateLimit,
  getRateLimitStats,
};
