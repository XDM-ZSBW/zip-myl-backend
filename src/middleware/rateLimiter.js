const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Redis client for rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
});

// Rate limit configurations
const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      // Use device ID if available, otherwise fall back to IP
      return req.deviceId || req.ip || 'anonymous';
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/v1/health';
    }
  },

  // Authentication endpoints rate limit
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `auth:${req.deviceId || req.ip || 'anonymous'}`;
    }
  },

  // Device registration rate limit
  deviceRegistration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 device registrations per hour
    message: {
      error: 'Too many device registrations',
      message: 'Too many device registrations. Please try again later.',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `device_reg:${req.ip || 'anonymous'}`;
    }
  },

  // API key operations rate limit
  apiKey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 API key operations per hour
    message: {
      error: 'Too many API key operations',
      message: 'Too many API key operations. Please try again later.',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `api_key:${req.deviceId || req.ip || 'anonymous'}`;
    }
  },

  // Enhanced Trust Network rate limit
  enhancedTrustNetwork: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: {
      error: 'Too many enhanced trust network requests',
      message: 'Too many enhanced trust network requests. Please try again later.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `enhanced_trust:${req.deviceId || req.ip || 'anonymous'}`;
    }
  },

  // Enhanced sites configuration rate limit
  enhancedSites: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
      error: 'Too many enhanced sites requests',
      message: 'Too many enhanced sites requests. Please try again later.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `enhanced_sites:${req.deviceId || req.ip || 'anonymous'}`;
    }
  },

  // Permissions validation rate limit
  permissions: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: {
      error: 'Too many permission validation requests',
      message: 'Too many permission validation requests. Please try again later.',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `permissions:${req.deviceId || req.ip || 'anonymous'}`;
    }
  },

  // Strict rate limit for sensitive operations
  strict: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 attempts per window
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded for sensitive operations. Please try again later.',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    keyGenerator: (req) => {
      return `strict:${req.deviceId || req.ip || 'anonymous'}`;
    }
  }
};

// Create rate limit middleware functions
const createRateLimiter = (config) => {
  return rateLimit({
    ...config,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        deviceId: req.deviceId,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        limit: config.max,
        windowMs: config.windowMs
      });

      res.status(429).json(config.message);
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
};

// Export rate limiters
const generalRateLimit = createRateLimiter(rateLimitConfigs.general);
const authRateLimit = createRateLimiter(rateLimitConfigs.auth);
const deviceRegistrationRateLimit = createRateLimiter(rateLimitConfigs.deviceRegistration);
const apiKeyRateLimit = createRateLimiter(rateLimitConfigs.apiKey);
const strictRateLimit = createRateLimiter(rateLimitConfigs.strict);
const enhancedTrustNetworkRateLimit = createRateLimiter(rateLimitConfigs.enhancedTrustNetwork);
const enhancedSitesRateLimit = createRateLimiter(rateLimitConfigs.enhancedSites);
const permissionsRateLimit = createRateLimiter(rateLimitConfigs.permissions);

// Dynamic rate limiter based on device type
const dynamicRateLimit = (req, res, next) => {
  const deviceId = req.deviceId;
  
  if (!deviceId) {
    // No device ID, use strict rate limiting
    return strictRateLimit(req, res, next);
  }

  // Check if device has special rate limit privileges
  // This could be based on device reputation, subscription, etc.
  const isPrivilegedDevice = req.deviceType === 'premium' || req.deviceRole === 'admin';
  
  if (isPrivilegedDevice) {
    // Higher rate limits for privileged devices
    const privilegedConfig = {
      ...rateLimitConfigs.general,
      max: rateLimitConfigs.general.max * 2 // Double the limit
    };
    return createRateLimiter(privilegedConfig)(req, res, next);
  }

  // Use standard rate limiting
  return generalRateLimit(req, res, next);
};

// Rate limit bypass for internal services
const bypassRateLimit = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const internalApiKey = process.env.INTERNAL_API_KEY;
  
  if (apiKey && apiKey === internalApiKey) {
    logger.info('Rate limit bypassed for internal service', {
      ip: req.ip,
      path: req.path
    });
    return next();
  }
  
  return dynamicRateLimit(req, res, next);
};

// Rate limit based on endpoint type
const endpointRateLimit = (req, res, next) => {
  const path = req.path;
  
  // Authentication endpoints
  if (path.includes('/auth/')) {
    return authRateLimit(req, res, next);
  }
  
  // Device registration
  if (path.includes('/device/register')) {
    return deviceRegistrationRateLimit(req, res, next);
  }
  
  // API key management
  if (path.includes('/admin/keys/')) {
    return apiKeyRateLimit(req, res, next);
  }
  
  // Sensitive operations
  if (path.includes('/admin/') || path.includes('/sensitive/')) {
    return strictRateLimit(req, res, next);
  }
  
  // Default rate limiting
  return dynamicRateLimit(req, res, next);
};

// Cleanup function for graceful shutdown
const cleanup = async () => {
  try {
    await redis.quit();
    logger.info('Rate limiter Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis connection', { error: error.message });
  }
};

// Handle Redis connection errors
redis.on('error', (error) => {
  logger.error('Redis connection error in rate limiter', { error: error.message });
});

redis.on('connect', () => {
  logger.info('Rate limiter Redis connection established');
});

module.exports = {
  generalRateLimit,
  authRateLimit,
  deviceRegistrationRateLimit,
  apiKeyRateLimit,
  strictRateLimit,
  enhancedTrustNetworkRateLimit,
  enhancedSitesRateLimit,
  permissionsRateLimit,
  dynamicRateLimit,
  bypassRateLimit,
  endpointRateLimit,
  cleanup,
  redis
};