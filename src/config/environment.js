/**
 * Environment Configuration for Myl.Zip Backend
 * Automatically detects and configures environment-specific settings
 */

class BackendEnvironmentConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.config = this.getEnvironmentConfig();
  }

  detectEnvironment() {
    // Check NODE_ENV first
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV.toLowerCase();
    }

    // Check for Google Cloud Run environment
    if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
      return 'production';
    }

    // Check for staging indicators
    if (process.env.STAGING === 'true' || process.env.ENVIRONMENT === 'staging') {
      return 'staging';
    }

    // Check for development indicators
    if (process.env.PORT === '3333' || process.env.DEVELOPMENT === 'true') {
      return 'development';
    }

    // Default to development for local environments
    return 'development';
  }

  getEnvironmentConfig() {
    const configs = {
      development: {
        environment: 'development',
        server: {
          port: parseInt(process.env.PORT, 10) || 3333,
          host: process.env.HOST || '0.0.0.0',
        },
        cors: {
          origins: [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'chrome-extension://*',
            'moz-extension://*',
          ],
          credentials: false,
        },
        database: {
          url: process.env.DATABASE_URL || 'postgresql://localhost:5432/myl_zip_dev',
          ssl: false,
          poolMin: 2,
          poolMax: 10,
        },
        redis: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          enabled: false, // Disabled for development
        },
        features: {
          enableDebugLogging: true,
          enableVerboseErrors: true,
          enableTestEndpoints: true,
          authRequired: false,
          enableMetrics: true,
          enableRateLimit: false,
        },
        security: {
          jwtSecret: 'dev-jwt-secret-change-in-production',
          encryptionKey: 'dev-encryption-key-change-in-production',
          apiKey: 'dev-api-key-change-in-production',
        },
      },
      staging: {
        environment: 'staging',
        server: {
          port: parseInt(process.env.PORT, 10) || 8080,
          host: process.env.HOST || '0.0.0.0',
        },
        cors: {
          origins: [
            'https://staging.myl.zip',
            'https://stage.myl.zip',
            'https://dev.myl.zip',
            'chrome-extension://*',
            'moz-extension://*',
          ],
          credentials: true,
        },
        database: {
          url: process.env.DATABASE_URL || process.env.STAGING_DATABASE_URL,
          ssl: true,
          poolMin: 2,
          poolMax: 20,
        },
        redis: {
          url: process.env.REDIS_URL || process.env.STAGING_REDIS_URL,
          enabled: true,
        },
        features: {
          enableDebugLogging: true,
          enableVerboseErrors: true,
          enableTestEndpoints: true,
          authRequired: true,
          enableMetrics: true,
          enableRateLimit: true,
        },
        security: {
          jwtSecret: process.env.JWT_SECRET || 'staging-jwt-secret',
          encryptionKey: process.env.ENCRYPTION_MASTER_KEY || 'staging-encryption-key',
          apiKey: process.env.SERVICE_API_KEY || 'staging-api-key',
        },
      },
      production: {
        environment: 'production',
        server: {
          port: parseInt(process.env.PORT, 10) || 8080,
          host: process.env.HOST || '0.0.0.0',
        },
        cors: {
          origins: [
            'https://myl.zip',
            'https://www.myl.zip',
            'https://mykeys.zip',
            'https://www.mykeys.zip',
            'chrome-extension://*',
            'moz-extension://*',
          ],
          credentials: true,
        },
        database: {
          url: process.env.DATABASE_URL,
          ssl: true,
          poolMin: 5,
          poolMax: 50,
        },
        redis: {
          url: process.env.REDIS_URL,
          enabled: true,
        },
        features: {
          enableDebugLogging: false,
          enableVerboseErrors: false,
          enableTestEndpoints: false,
          authRequired: true,
          enableMetrics: true,
          enableRateLimit: true,
        },
        security: {
          jwtSecret: process.env.JWT_SECRET,
          encryptionKey: process.env.ENCRYPTION_MASTER_KEY,
          apiKey: process.env.SERVICE_API_KEY,
        },
      }
    };

    return configs[this.environment];
  }

  getPort() {
    return this.config.server.port;
  }

  getHost() {
    return this.config.server.host;
  }

  getCorsOrigins() {
    return this.config.cors.origins;
  }

  getDatabaseConfig() {
    return this.config.database;
  }

  getRedisConfig() {
    return this.config.redis;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  isProduction() {
    return this.environment === 'production';
  }

  isDevelopment() {
    return this.environment === 'development';
  }

  isStaging() {
    return this.environment === 'staging';
  }

  shouldLog(level = 'info') {
    if (!this.config.features.enableDebugLogging) {
      return level === 'error' || level === 'warn';
    }
    return true;
  }

  shouldEnableFeature(feature) {
    return this.config.features[feature] || false;
  }

  logEnvironmentInfo() {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.log(`🌍 Myl.Zip Backend Environment: ${this.environment.toUpperCase()}`);
      // eslint-disable-next-line no-console
      console.log(`🚀 Server: ${this.config.server.host}:${this.config.server.port}`);
      // eslint-disable-next-line no-console
      console.log(`🗄️  Database: ${this.config.database.url ? 'Configured' : 'Not configured'}`);
      // eslint-disable-next-line no-console
      console.log(`📊 Redis: ${this.config.redis.enabled ? 'Enabled' : 'Disabled'}`);
      // eslint-disable-next-line no-console
      console.log(`🔐 Auth Required: ${this.config.features.authRequired}`);
      // eslint-disable-next-line no-console
      console.log(`📈 Metrics: ${this.config.features.enableMetrics ? 'Enabled' : 'Disabled'}`);
      // eslint-disable-next-line no-console
      console.log(`⚡ Rate Limiting: ${this.config.features.enableRateLimit ? 'Enabled' : 'Disabled'}`);
    }
  }
}

// Export singleton instance
const backendEnvironmentConfig = new BackendEnvironmentConfig();

// Log environment info on load
backendEnvironmentConfig.logEnvironmentInfo();

module.exports = { BackendEnvironmentConfig, backendEnvironmentConfig };

