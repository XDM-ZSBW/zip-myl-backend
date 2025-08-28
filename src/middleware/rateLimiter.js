const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Redis client for rate limiting with fallback
let redis = null;
let redisStore = null;
let useRedis = false;

// Initialize Redis connection
const initializeRedis = () => {
  try {
    if (process.env.REDIS_HOST || process.env.REDIS_PASSWORD) {
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true, // Don't connect immediately
        retryDelayOnClusterDown: 100,
        enableOfflineQueue: false,
      });

      redis.on('error', (error) => {
        logger.warn('Redis connection error in rate limiter, falling back to memory', {
          error: error.message,
          fallback: 'memory',
        });
        useRedis = false;
      });

      redis.on('connect', () => {
        logger.info('Rate limiter Redis connection established');
        useRedis = true;
      });

      redis.on('ready', () => {
        logger.info('Rate limiter Redis ready');
        useRedis = true;
      });

      // Test connection
      redis.ping().then(() => {
        useRedis = true;
        logger.info('Rate limiter Redis connection test successful');
      }).catch(() => {
        logger.warn('Rate limiter Redis connection test failed, using memory fallback');
        useRedis = false;
      });

      redisStore = new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      });
    } else {
      logger.info('No Redis configuration found, using memory-based rate limiting');
      useRedis = false;
    }
  } catch (error) {
    logger.warn('Failed to initialize Redis, using memory fallback', { error: error.message });
    useRedis = false;
  }
};

// Initialize Redis on module load
initializeRedis();

// Create rate limiter with fallback
const createRateLimiter = (config) => {
  const rateLimitConfig = {
    ...config,
    standardHeaders: true,
    legacyHeaders: false,
    store: useRedis && redisStore ? redisStore : undefined, // Use memory store if Redis unavailable
    keyGenerator: config.keyGenerator || ((req) => req.deviceId || req.ip || 'anonymous'),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        deviceId: req.deviceId,
      });
      res.status(429).json(config.message || {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    },
  };

  return rateLimit(rateLimitConfig);
};

// Rate limit configurations
const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000),
    },
    keyGenerator: (req) => {
      // Use device ID if available, otherwise fall back to IP
      return req.deviceId || req.ip || 'anonymous';
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/v1/health';
    },
  },

  // Authentication endpoints rate limit
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts. Please try again later.',
      retryAfter: 900,
    },
    keyGenerator: (req) => {
      return `auth:${req.deviceId || req.ip || 'anonymous'}`;
    },
  },

  // Device registration rate limit
  deviceRegistration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 device registrations per hour
    message: {
      error: 'Too many device registrations',
      message: 'Too many device registrations. Please try again later.',
      retryAfter: 3600,
    },
    keyGenerator: (req) => {
      return `device_reg:${req.ip || 'anonymous'}`;
    },
  },

  // API key operations rate limit
  apiKey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 API key operations per hour
    message: {
      error: 'Too many API key operations',
      message: 'Too many API key operations. Please try again later.',
      retryAfter: 3600,
    },
    keyGenerator: (req) => {
      return `api_key:${req.deviceId || req.ip || 'anonymous'}`;
    },
  },
};

// Export rate limiters
const generalRateLimit = createRateLimiter(rateLimitConfigs.general);
const authRateLimit = createRateLimiter(rateLimitConfigs.auth);
const deviceRegistrationRateLimit = createRateLimiter(rateLimitConfigs.deviceRegistration);
const apiKeyRateLimit = createRateLimiter(rateLimitConfigs.apiKey);

// Dynamic rate limiter based on device type
const dynamicRateLimit = (req, res, next) => {
  const deviceId = req.deviceId;

  if (!deviceId) {
    // No device ID, use strict rate limiting
    return generalRateLimit(req, res, next);
  }

  // Check if device has special rate limit privileges
  // This could be based on device reputation, subscription, etc.
  const isPrivilegedDevice = req.deviceType === 'premium' || req.deviceRole === 'admin';

  if (isPrivilegedDevice) {
    // Higher rate limits for privileged devices
    const privilegedConfig = {
      ...rateLimitConfigs.general,
      max: rateLimitConfigs.general.max * 2, // Double the limit
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
      path: req.path,
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
    return generalRateLimit(req, res, next); // Changed to generalRateLimit for strict rate limiting
  }

  // Default rate limiting
  return dynamicRateLimit(req, res, next);
};

// Cleanup function for graceful shutdown
const cleanup = async() => {
  if (redis) {
    try {
      await redis.quit();
      logger.info('Rate limiter Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error: error.message });
    }
  }
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  deviceRegistrationRateLimit,
  apiKeyRateLimit,
  dynamicRateLimit,
  bypassRateLimit,
  endpointRateLimit,
  cleanup,
  redis,
};
