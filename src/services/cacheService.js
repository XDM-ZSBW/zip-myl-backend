const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../utils/config');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryDelayOnFailover: config.redis.retryDelayOnFailover,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Redis connection failed:', error);
      this.isConnected = false;
      // Don't throw error - allow app to continue without cache
    }
  }

  async disconnect() {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis disconnected successfully');
        this.isConnected = false;
      } catch (error) {
        logger.error('Redis disconnection failed:', error);
      }
    }
  }

  async get(key) {
    if (!this.isConnected || !config.features.enableCaching) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isConnected || !config.features.enableCaching) {
      return false;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !config.features.enableCaching) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !config.features.enableCaching) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.isConnected || !config.features.enableCaching) {
      return false;
    }

    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async flush() {
    if (!this.isConnected || !config.features.enableCaching) {
      return false;
    }

    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async healthCheck() {
    if (!this.isConnected || !config.features.enableCaching) {
      return { status: 'disabled', timestamp: new Date().toISOString() };
    }

    try {
      await this.redis.ping();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // Helper methods for common cache patterns
  async cacheThought(thoughtId, thought, ttl = 3600) {
    const key = `thought:${thoughtId}`;
    return await this.set(key, thought, ttl);
  }

  async getCachedThought(thoughtId) {
    const key = `thought:${thoughtId}`;
    return await this.get(key);
  }

  async cacheUserThoughts(userId, thoughts, ttl = 1800) {
    const key = `user:${userId}:thoughts`;
    return await this.set(key, thoughts, ttl);
  }

  async getCachedUserThoughts(userId) {
    const key = `user:${userId}:thoughts`;
    return await this.get(key);
  }

  async invalidateUserThoughts(userId) {
    const key = `user:${userId}:thoughts`;
    return await this.del(key);
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
