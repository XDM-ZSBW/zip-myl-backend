const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Redis client for rate limiting
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Enhanced Rate Limiter with Client-Specific Limits
 * Provides different rate limits based on client platform and capabilities
 */
class EnhancedRateLimiter {
  constructor() {
    this.platformLimits = this.getPlatformLimits();
    this.clientLimits = new Map(); // Cache for client-specific limits
  }

  /**
   * Get rate limits for different client platforms
   */
  getPlatformLimits() {
    return {
      web: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // requests per window
        message: 'Too many requests from web client',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      desktop: {
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'Too many requests from desktop client',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      mobile: {
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: 'Too many requests from mobile client',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      development: {
        windowMs: 15 * 60 * 1000,
        max: 2000,
        message: 'Too many requests from development client',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      enterprise: {
        windowMs: 15 * 60 * 1000,
        max: 5000,
        message: 'Too many requests from enterprise client',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    };
  }

  /**
   * Create rate limiter for specific endpoint
   */
  createEndpointLimiter(endpoint, defaultLimit = 'web') {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: (req) => this.getClientLimit(req, endpoint),
      message: (req) => this.getLimitMessage(req, endpoint),
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.generateKey(req, endpoint),
      handler: (req, res) => this.handleLimitExceeded(req, res, endpoint),
      onLimitReached: (req, res, options) => this.onLimitReached(req, res, options, endpoint)
    });
  }

  /**
   * Get client-specific rate limit
   */
  getClientLimit(req, endpoint) {
    const platform = req.clientPlatform || 'web';
    const baseLimit = this.platformLimits[platform]?.max || this.platformLimits.web.max;
    
    // Apply endpoint-specific multipliers
    const endpointMultipliers = {
      'auth': 0.5, // Auth endpoints are more restrictive
      'sync': 2.0, // Sync endpoints allow more requests
      'thoughts': 1.0, // Standard limit for thoughts
      'nft': 0.8, // NFT endpoints slightly more restrictive
      'workspace': 1.5, // Workspace operations allow more requests
      'plugin': 1.2, // Plugin operations moderately restricted
      'device': 1.0, // Device operations standard limit
      'default': 1.0
    };

    const multiplier = endpointMultipliers[endpoint] || endpointMultipliers.default;
    return Math.floor(baseLimit * multiplier);
  }

  /**
   * Generate rate limit key
   */
  generateKey(req, endpoint) {
    const deviceId = req.device?.id || req.headers['x-device-id'] || 'anonymous';
    const platform = req.clientPlatform || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    return `${endpoint}:${platform}:${deviceId}:${ip}`;
  }

  /**
   * Get limit exceeded message
   */
  getLimitMessage(req, endpoint) {
    const platform = req.clientPlatform || 'web';
    const baseMessage = this.platformLimits[platform]?.message || this.platformLimits.web.message;
    
    return {
      error: 'Rate limit exceeded',
      message: `${baseMessage} for ${endpoint} endpoint`,
      platform: platform,
      endpoint: endpoint,
      retryAfter: Math.ceil(15 * 60 / 60), // minutes
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle rate limit exceeded
   */
  handleLimitExceeded(req, res, endpoint) {
    const message = this.getLimitMessage(req, endpoint);
    
    logger.warn(`Rate limit exceeded for ${endpoint}`, {
      deviceId: req.device?.id,
      platform: req.clientPlatform,
      ip: req.ip,
      endpoint: endpoint,
      userAgent: req.get('User-Agent')
    });

    res.status(429).json({
      success: false,
      error: message
    });
  }

  /**
   * Handle rate limit reached event
   */
  onLimitReached(req, res, options, endpoint) {
    logger.info(`Rate limit reached for ${endpoint}`, {
      deviceId: req.device?.id,
      platform: req.clientPlatform,
      ip: req.ip,
      endpoint: endpoint,
      limit: options.limit,
      windowMs: options.windowMs
    });
  }

  /**
   * Create specific endpoint limiters
   */
  createAuthLimiter() {
    return this.createEndpointLimiter('auth');
  }

  createSyncLimiter() {
    return this.createEndpointLimiter('sync');
  }

  createThoughtsLimiter() {
    return this.createEndpointLimiter('thoughts');
  }

  createNftLimiter() {
    return this.createEndpointLimiter('nft');
  }

  createWorkspaceLimiter() {
    return this.createEndpointLimiter('workspace');
  }

  createPluginLimiter() {
    return this.createEndpointLimiter('plugin');
  }

  createDeviceLimiter() {
    return this.createEndpointLimiter('device');
  }

  /**
   * Create burst limiter for high-frequency operations
   */
  createBurstLimiter(endpoint, burstLimit = 10, windowMs = 60000) {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      }),
      windowMs: windowMs,
      max: (req) => this.getBurstLimit(req, endpoint, burstLimit),
      message: (req) => this.getBurstLimitMessage(req, endpoint),
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.generateBurstKey(req, endpoint),
      handler: (req, res) => this.handleBurstLimitExceeded(req, res, endpoint)
    });
  }

  /**
   * Get burst limit based on client platform
   */
  getBurstLimit(req, endpoint, burstLimit) {
    const platform = req.clientPlatform || 'web';
    const platformMultipliers = {
      'web': 1.0,
      'desktop': 1.5,
      'mobile': 0.5,
      'development': 2.0,
      'enterprise': 3.0
    };

    const multiplier = platformMultipliers[platform] || 1.0;
    return Math.floor(burstLimit * multiplier);
  }

  /**
   * Generate burst limit key
   */
  generateBurstKey(req, endpoint) {
    const deviceId = req.device?.id || req.headers['x-device-id'] || 'anonymous';
    const platform = req.clientPlatform || 'unknown';
    
    return `burst:${endpoint}:${platform}:${deviceId}`;
  }

  /**
   * Get burst limit message
   */
  getBurstLimitMessage(req, endpoint) {
    const platform = req.clientPlatform || 'web';
    
    return {
      error: 'Burst rate limit exceeded',
      message: `Too many rapid requests to ${endpoint} endpoint`,
      platform: platform,
      endpoint: endpoint,
      retryAfter: Math.ceil(60 / 60), // seconds
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle burst limit exceeded
   */
  handleBurstLimitExceeded(req, res, endpoint) {
    const message = this.getBurstLimitMessage(req, endpoint);
    
    logger.warn(`Burst rate limit exceeded for ${endpoint}`, {
      deviceId: req.device?.id,
      platform: req.clientPlatform,
      ip: req.ip,
      endpoint: endpoint
    });

    res.status(429).json({
      success: false,
      error: message
    });
  }

  /**
   * Create WebSocket rate limiter
   */
  createWebSocketLimiter() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redis.call(...args),
      }),
      windowMs: 60 * 1000, // 1 minute
      max: (req) => this.getWebSocketLimit(req),
      message: (req) => this.getWebSocketLimitMessage(req),
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req) => this.generateWebSocketKey(req),
      handler: (req, res) => this.handleWebSocketLimitExceeded(req, res)
    });
  }

  /**
   * Get WebSocket rate limit
   */
  getWebSocketLimit(req) {
    const platform = req.clientPlatform || 'web';
    const platformLimits = {
      'web': 100,
      'desktop': 200,
      'mobile': 50,
      'development': 500,
      'enterprise': 1000
    };

    return platformLimits[platform] || platformLimits.web;
  }

  /**
   * Generate WebSocket rate limit key
   */
  generateWebSocketKey(req) {
    const deviceId = req.headers['x-device-id'] || 'anonymous';
    const platform = req.headers['x-client-platform'] || 'unknown';
    
    return `websocket:${platform}:${deviceId}`;
  }

  /**
   * Get WebSocket limit message
   */
  getWebSocketLimitMessage(req) {
    const platform = req.headers['x-client-platform'] || 'web';
    
    return {
      error: 'WebSocket rate limit exceeded',
      message: 'Too many WebSocket connection attempts',
      platform: platform,
      retryAfter: Math.ceil(60 / 60), // seconds
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Handle WebSocket limit exceeded
   */
  handleWebSocketLimitExceeded(req, res) {
    const message = this.getWebSocketLimitMessage(req);
    
    logger.warn('WebSocket rate limit exceeded', {
      deviceId: req.headers['x-device-id'],
      platform: req.headers['x-client-platform'],
      ip: req.ip
    });

    res.status(429).json({
      success: false,
      error: message
    });
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats() {
    try {
      const keys = await redis.keys('rl:*');
      const stats = {
        totalKeys: keys.length,
        platforms: {},
        endpoints: {}
      };

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const endpoint = parts[1];
          const platform = parts[2];
          
          if (!stats.platforms[platform]) {
            stats.platforms[platform] = 0;
          }
          if (!stats.endpoints[endpoint]) {
            stats.endpoints[endpoint] = 0;
          }
          
          stats.platforms[platform]++;
          stats.endpoints[endpoint]++;
        }
      }

      return stats;
    } catch (error) {
      logger.error('Error getting rate limit stats:', error);
      return { error: 'Failed to get rate limit statistics' };
    }
  }

  /**
   * Reset rate limits for specific client
   */
  async resetClientLimits(deviceId, platform) {
    try {
      const pattern = `rl:*:${platform}:${deviceId}:*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Reset rate limits for device ${deviceId} on platform ${platform}`);
        return { success: true, resetKeys: keys.length };
      }
      
      return { success: true, resetKeys: 0 };
    } catch (error) {
      logger.error(`Error resetting rate limits for device ${deviceId}:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const enhancedRateLimiter = new EnhancedRateLimiter();

// Export specific limiters for easy use
module.exports = {
  EnhancedRateLimiter,
  enhancedRateLimiter,
  
  // Specific endpoint limiters
  authRateLimit: enhancedRateLimiter.createAuthLimiter(),
  syncRateLimit: enhancedRateLimiter.createSyncLimiter(),
  thoughtsRateLimit: enhancedRateLimiter.createThoughtsLimiter(),
  nftRateLimit: enhancedRateLimiter.createNftLimiter(),
  workspaceRateLimit: enhancedRateLimiter.createWorkspaceLimiter(),
  pluginRateLimit: enhancedRateLimiter.createPluginLimiter(),
  deviceRateLimit: enhancedRateLimiter.createDeviceLimiter(),
  
  // Special limiters
  burstRateLimit: (endpoint, burstLimit, windowMs) => 
    enhancedRateLimiter.createBurstLimiter(endpoint, burstLimit, windowMs),
  webSocketRateLimit: enhancedRateLimiter.createWebSocketLimiter(),
  
  // Utility functions
  getRateLimitStats: () => enhancedRateLimiter.getRateLimitStats(),
  resetClientLimits: (deviceId, platform) => enhancedRateLimiter.resetClientLimits(deviceId, platform)
};
