const redis = require('redis');
const logger = require('../utils/logger');

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  async initialize() {
    try {
      const config = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            // End reconnecting on a specific error and flush all commands with a individual error
            return new Error('The server refused the connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands with a individual error
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      };

      this.client = redis.createClient(config);
      
      // Handle connection events
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });
      
      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });
      
      this.client.on('error', (err) => {
        logger.error('Redis client error', err);
        this.isConnected = false;
      });
      
      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });
      
      // Test connection
      await this.client.ping();
      logger.info('Redis connection established successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Redis connection', error);
      throw error;
    }
  }

  /**
   * Set key-value pair with optional TTL
   */
  async set(key, value, ttl = null) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      logger.debug('Redis SET', { key, ttl });
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get value by key
   */
  async get(key) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }
      
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Delete key
   */
  async del(key) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      await this.client.del(key);
      logger.debug('Redis DEL', { key });
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key, ttl) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      await this.client.expire(key, ttl);
      logger.debug('Redis EXPIRE', { key, ttl });
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, ttl, error: error.message });
      throw error;
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get multiple keys
   */
  async mget(keys) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      const values = await this.client.mget(keys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Redis MGET error', { keys, error: error.message });
      throw error;
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs, ttl = null) {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    
    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      
      await pipeline.exec();
      logger.debug('Redis MSET', { keys: Object.keys(keyValuePairs), ttl });
    } catch (error) {
      logger.error('Redis MSET error', { error: error.message });
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected() {
    return this.isConnected;
  }
}

// Export singleton instance
module.exports = new RedisManager();
