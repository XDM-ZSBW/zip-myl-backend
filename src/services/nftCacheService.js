const { logger } = require('../utils/logger');

class NFTCacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a key-value pair in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {boolean} Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      // Clear existing timer if any
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Set the value
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + (ttl * 1000)
      });

      // Set expiration timer
      const timer = setTimeout(() => {
        this.del(key);
      }, ttl * 1000);

      this.timers.set(key, timer);

      logger.debug(`Cached key: ${key} with TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Error setting cache key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }

      // Check if expired
      if (Date.now() > item.expiresAt) {
        this.del(key);
        return null;
      }

      logger.debug(`Cache hit for key: ${key}`);
      return item.value;
    } catch (error) {
      logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  async del(key) {
    try {
      // Clear timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      // Remove from cache
      const deleted = this.cache.delete(key);
      
      if (deleted) {
        logger.debug(`Deleted cache key: ${key}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Error deleting cache key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} Exists status
   */
  async exists(key) {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return false;
      }

      // Check if expired
      if (Date.now() > item.expiresAt) {
        this.del(key);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Error checking cache key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  async getStats() {
    try {
      const now = Date.now();
      let expiredCount = 0;
      let validCount = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          expiredCount++;
        } else {
          validCount++;
        }
      }

      return {
        totalKeys: this.cache.size,
        validKeys: validCount,
        expiredKeys: expiredCount,
        timers: this.timers.size
      };
    } catch (error) {
      logger.error(`Error getting cache stats: ${error.message}`);
      return {
        totalKeys: 0,
        validKeys: 0,
        expiredKeys: 0,
        timers: 0
      };
    }
  }

  /**
   * Clear all expired keys
   * @returns {number} Number of keys cleared
   */
  async clearExpired() {
    try {
      const now = Date.now();
      let clearedCount = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          await this.del(key);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        logger.info(`Cleared ${clearedCount} expired cache keys`);
      }

      return clearedCount;
    } catch (error) {
      logger.error(`Error clearing expired cache keys: ${error.message}`);
      return 0;
    }
  }

  /**
   * Clear all cache
   * @returns {boolean} Success status
   */
  async clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }

      this.timers.clear();
      this.cache.clear();

      logger.info('Cache cleared successfully');
      return true;
    } catch (error) {
      logger.error(`Error clearing cache: ${error.message}`);
      return false;
    }
  }
}

// Create singleton instance
const nftCacheService = new NFTCacheService();

module.exports = { nftCacheService };
