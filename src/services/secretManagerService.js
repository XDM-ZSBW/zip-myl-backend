const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { logger } = require('../utils/logger');

/**
 * Google Secret Manager Service
 * Handles secure secret retrieval from Google Secret Manager
 */
class SecretManagerService {
  constructor() {
    this.client = new SecretManagerServiceClient();
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'zip-myl-backend';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get secret from Secret Manager with caching
   */
  async getSecret(secretName, useCache = true) {
    // Use the secret name directly (no prefix needed for existing secrets)
    const fullSecretName = secretName;
    
    // Check cache first
    if (useCache && this.cache.has(fullSecretName)) {
      const cached = this.cache.get(fullSecretName);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }
    }

    try {
      const [version] = await this.client.accessSecretVersion({
        name: `projects/${this.projectId}/secrets/${fullSecretName}/versions/latest`,
      });

      const secretValue = version.payload.data.toString();
      
      // Cache the secret
      if (useCache) {
        this.cache.set(fullSecretName, {
          value: secretValue,
          timestamp: Date.now()
        });
      }

      logger.info(`Secret retrieved from Secret Manager: ${fullSecretName}`);
      return secretValue;
    } catch (error) {
      logger.error(`Failed to retrieve secret ${fullSecretName}:`, error);
      throw new Error(`Secret ${fullSecretName} not found in Secret Manager`);
    }
  }

  /**
   * Get JWT secret
   */
  async getJwtSecret() {
    return await this.getSecret('JWT_SECRET');
  }

  /**
   * Get JWT refresh secret
   */
  async getJwtRefreshSecret() {
    return await this.getSecret('JWT_REFRESH_SECRET');
  }

  /**
   * Get service API key (using INTERNAL_API_KEY)
   */
  async getServiceApiKey() {
    return await this.getSecret('INTERNAL_API_KEY');
  }

  /**
   * Get database URL
   */
  async getDatabaseUrl() {
    return await this.getSecret('DATABASE_URL');
  }

  /**
   * Get Redis password
   */
  async getRedisPassword() {
    return await this.getSecret('REDIS_PASSWORD');
  }

  /**
   * Get all secrets at once
   */
  async getAllSecrets() {
    try {
      const [jwtSecret, jwtRefreshSecret, serviceApiKey, databaseUrl, redisPassword] = await Promise.all([
        this.getJwtSecret(),
        this.getJwtRefreshSecret(),
        this.getServiceApiKey(),
        this.getDatabaseUrl(),
        this.getRedisPassword()
      ]);

      return {
        jwtSecret,
        jwtRefreshSecret,
        serviceApiKey,
        databaseUrl,
        redisPassword
      };
    } catch (error) {
      logger.error('Failed to retrieve secrets from Secret Manager:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Secret Manager cache cleared');
  }

  /**
   * Check if Secret Manager is available
   */
  async isAvailable() {
    try {
      await this.getSecret('JWT_SECRET', false);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get secret status
   */
  async getSecretStatus() {
    const secrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'INTERNAL_API_KEY',
      'DATABASE_URL',
      'REDIS_PASSWORD'
    ];

    const status = {};
    
    for (const secret of secrets) {
      try {
        await this.getSecret(secret, false);
        status[secret] = 'available';
      } catch (error) {
        status[secret] = 'unavailable';
      }
    }

    return status;
  }
}

module.exports = new SecretManagerService();
