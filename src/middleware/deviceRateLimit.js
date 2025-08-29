/**
 * Device-Based Rate Limiting Middleware
 * Implements rate limiting per device for API security
 */

const rateLimit = require('express-rate-limit');
const { errorResponse } = require('./apiResponse');

/**
 * Device rate limiter - limits requests per device
 */
const deviceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each device to 100 requests per windowMs
  keyGenerator: (req) => {
    // Use device ID from header, fallback to IP
    return req.headers['x-device-id'] || req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this device',
      userAction: 'Please wait before making another request',
      retryAfter: null // Will be calculated
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    const errorData = {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this device',
      userAction: `Please wait ${retryAfter} seconds before making another request`,
      retryAfter,
      details: {
        deviceId: req.headers['x-device-id'] || 'unknown',
        ipAddress: req.ip,
        limit: options.max,
        windowMs: options.windowMs
      }
    };

    return errorResponse(res, errorData, 429);
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict device rate limiter - for sensitive operations
 */
const strictDeviceRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each device to 20 requests per windowMs
  keyGenerator: (req) => {
    return req.headers['x-device-id'] || req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations from this device',
      userAction: 'Please wait before making another sensitive request',
      retryAfter: null
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    const errorData = {
      code: 'STRICT_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations from this device',
      userAction: `Please wait ${retryAfter} seconds before making another sensitive request`,
      retryAfter,
      details: {
        deviceId: req.headers['x-device-id'] || 'unknown',
        ipAddress: req.ip,
        limit: options.max,
        windowMs: options.windowMs,
        operationType: 'sensitive'
      }
    };

    return errorResponse(res, errorData, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * API key rate limiter - for external API consumers
 */
const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each API key to 60 requests per minute
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || 'no-key';
  },
  message: {
    success: false,
    error: {
      code: 'API_KEY_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests with this API key',
      userAction: 'Please wait before making another request',
      retryAfter: null
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    const errorData = {
      code: 'API_KEY_RATE_LIMIT_EXCEEDED',
      message: 'Too many requests with this API key',
      userAction: `Please wait ${retryAfter} seconds before making another request`,
      retryAfter,
      details: {
        apiKey: req.headers['x-api-key'] ? '***' + req.headers['x-api-key'].slice(-4) : 'none',
        limit: options.max,
        windowMs: options.windowMs
      }
    };

    return errorResponse(res, errorData, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * NFT generation rate limiter - specific to NFT operations
 */
const nftGenerationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // limit each device to 5 NFT generation requests per 10 minutes
  keyGenerator: (req) => {
    return req.headers['x-device-id'] || req.ip;
  },
  message: {
    success: false,
    error: {
      code: 'NFT_GENERATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many NFT generation requests from this device',
      userAction: 'Please wait before generating another NFT',
      retryAfter: null
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    const errorData = {
      code: 'NFT_GENERATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many NFT generation requests from this device',
      userAction: `Please wait ${retryAfter} seconds before generating another NFT`,
      retryAfter,
      details: {
        deviceId: req.headers['x-device-id'] || 'unknown',
        ipAddress: req.ip,
        limit: options.max,
        windowMs: options.windowMs,
        operationType: 'nft-generation'
      }
    };

    return errorResponse(res, errorData, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter - for login/registration attempts
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per 15 minutes
  keyGenerator: (req) => {
    return req.ip; // Use IP for auth rate limiting
  },
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts',
      userAction: 'Please wait before trying to authenticate again',
      retryAfter: null
    },
    timestamp: new Date().toISOString(),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  handler: (req, res, next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    const errorData = {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts',
      userAction: `Please wait ${retryAfter} seconds before trying to authenticate again`,
      retryAfter,
      details: {
        ipAddress: req.ip,
        limit: options.max,
        windowMs: options.windowMs,
        operationType: 'authentication'
      }
    };

    return errorResponse(res, errorData, 429);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  deviceRateLimit,
  strictDeviceRateLimit,
  apiKeyRateLimit,
  nftGenerationRateLimit,
  authRateLimit
};
