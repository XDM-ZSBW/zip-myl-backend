const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Enhanced Rate Limiting for Extension Endpoints
 * Provides different rate limits based on endpoint sensitivity and device type
 */

// Extension-specific rate limit configurations
const extensionRateLimits = {
  // General extension API calls
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      success: false,
      error: 'Too many requests, please try again later',
      retryAfter: '15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use extension ID if available, otherwise device ID, then IP
      return req.headers['x-extension-id'] || req.deviceId || req.ip || 'anonymous';
    },
    skip: (req) => {
      // Skip rate limiting for health checks and internal services
      return req.path === '/health' ||
             req.path === '/api/v1/health' ||
             req.headers['x-internal-service'] === 'true';
    },
  },

  // Authentication and pairing operations (stricter limits)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      success: false,
      error: 'Too many authentication attempts',
      retryAfter: '15 minutes',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return `auth:${req.headers['x-extension-id'] || req.deviceId || req.ip || 'anonymous'}`;
    },
  },

  // Pairing code generation (very strict)
  pairingCode: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 pairing code generations per hour
    message: {
      success: false,
      error: 'Too many pairing code generation attempts',
      retryAfter: '1 hour',
      code: 'PAIRING_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return `pairing:${req.headers['x-extension-id'] || req.deviceId || req.ip || 'anonymous'}`;
    },
  },

  // Device registration (strict)
  deviceRegistration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 2, // 2 device registrations per hour
    message: {
      success: false,
      error: 'Too many device registration attempts',
      retryAfter: '1 hour',
      code: 'DEVICE_REG_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return `device_reg:${req.headers['x-extension-id'] || req.deviceId || req.ip || 'anonymous'}`;
    },
  },

  // NFT operations (moderate limits)
  nft: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 NFT operations per 15 minutes
    message: {
      success: false,
      error: 'Too many NFT operations',
      retryAfter: '15 minutes',
      code: 'NFT_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return `nft:${req.headers['x-extension-id'] || req.deviceId || req.ip || 'anonymous'}`;
    },
  },
};

// Create rate limiters
const createRateLimiter = (config) => {
  return rateLimit({
    ...config,
    handler: (req, res) => {
      logger.warn('Extension rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        extensionId: req.headers['x-extension-id'],
        deviceId: req.deviceId,
        userAgent: req.headers['user-agent'],
      });

      res.status(429).json(config.message);
    },
  });
};

// Export individual rate limiters
const generalExtensionLimit = createRateLimiter(extensionRateLimits.general);
const authExtensionLimit = createRateLimiter(extensionRateLimits.auth);
const pairingCodeLimit = createRateLimiter(extensionRateLimits.pairingCode);
const deviceRegistrationLimit = createRateLimiter(extensionRateLimits.deviceRegistration);
const nftLimit = createRateLimiter(extensionRateLimits.nft);

// Smart rate limiting middleware that applies appropriate limits based on endpoint
const smartExtensionRateLimit = (req, res, next) => {
  const path = req.path;

  // Authentication endpoints
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    return authExtensionLimit(req, res, next);
  }

  // Pairing code generation
  if (path.includes('/pairing-code') || path.includes('/pairing-codes')) {
    return pairingCodeLimit(req, res, next);
  }

  // Device registration
  if (path.includes('/device/register') || path.includes('/devices/register')) {
    return deviceRegistrationLimit(req, res, next);
  }

  // NFT operations
  if (path.includes('/nft/') || path.includes('/generate-nft')) {
    return nftLimit(req, res, next);
  }

  // Default to general extension limit
  return generalExtensionLimit(req, res, next);
};

// Rate limit bypass for trusted extensions
const bypassExtensionRateLimit = (req, res, next) => {
  const extensionId = req.headers['x-extension-id'];
  const apiKey = req.headers['x-api-key'];
  const trustedApiKey = process.env.TRUSTED_EXTENSION_API_KEY;

  // Check if this is a trusted extension
  if (extensionId && apiKey && apiKey === trustedApiKey) {
    logger.info('Rate limit bypassed for trusted extension', {
      extensionId,
      ip: req.ip,
      path: req.path,
    });
    return next();
  }

  // Apply smart rate limiting
  return smartExtensionRateLimit(req, res, next);
};

module.exports = {
  generalExtensionLimit,
  authExtensionLimit,
  pairingCodeLimit,
  deviceRegistrationLimit,
  nftLimit,
  smartExtensionRateLimit,
  bypassExtensionRateLimit,
};
