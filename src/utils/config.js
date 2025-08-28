/**
 * Configuration utility for Myl.Zip Backend
 * Provides sensible defaults and handles missing environment variables gracefully
 */

const config = {
  // Application Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 8080,
  HOST: process.env.HOST || '0.0.0.0',

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/myl_zip',
  DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX) || 10,
  DB_SSL: process.env.DB_SSL === 'true',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/myl_zip',
    poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
    poolMax: parseInt(process.env.DB_POOL_MAX) || 10,
    ssl: process.env.DB_SSL === 'true',
  },

  // Security Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ENCRYPTION_MASTER_KEY: process.env.ENCRYPTION_MASTER_KEY || 'dev-encryption-key-change-in-production',
  SERVICE_API_KEY: process.env.SERVICE_API_KEY || 'dev-api-key-change-in-production',

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',

  // CORS Configuration Object (for middleware)
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [
      'chrome-extension://*',
      'moz-extension://*',
      'https://*.google.com',
      'https://*.github.com',
      'https://*.myl.zip',
      'http://localhost:*',
      'https://localhost:*',
    ],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    optionsSuccessStatus: 200,
  },

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FORMAT: process.env.LOG_FORMAT || 'combined',
  LOG_FILE: process.env.LOG_FILE || 'logs/app.log',
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
  LOG_MAX_FILES: parseInt(process.env.LOG_MAX_FILES) || 5,

  // Monitoring Configuration
  ENABLE_METRICS: process.env.ENABLE_METRICS !== 'false',
  METRICS_PORT: parseInt(process.env.METRICS_PORT) || 9090,
  PROMETHEUS_ENABLED: process.env.PROMETHEUS_ENABLED !== 'false',

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',

  // Encryption Configuration
  ENCRYPTION_ALGORITHM: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  KEY_DERIVATION_ITERATIONS: parseInt(process.env.KEY_DERIVATION_ITERATIONS) || 100000,
  KEY_ROTATION_INTERVAL_DAYS: parseInt(process.env.KEY_ROTATION_INTERVAL_DAYS) || 30,

  // Device Trust Configuration
  DEVICE_TRUST_EXPIRY_DAYS: parseInt(process.env.DEVICE_TRUST_EXPIRY_DAYS) || 365,
  PAIRING_CODE_EXPIRY_MINUTES: parseInt(process.env.PAIRING_CODE_EXPIRY_MINUTES) || 10,
  MAX_TRUSTED_DEVICES: parseInt(process.env.MAX_TRUSTED_DEVICES) || 10,

  // Backup Configuration
  BACKUP_ENABLED: process.env.BACKUP_ENABLED === 'true',
  BACKUP_SCHEDULE: process.env.BACKUP_SCHEDULE || '0 2 * * *',
  BACKUP_RETENTION_DAYS: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  BACKUP_BUCKET: process.env.BACKUP_BUCKET || 'gs://zip-myl-backend-backups',

  // Health Check Configuration
  HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  LIVENESS_PROBE_PATH: process.env.LIVENESS_PROBE_PATH || '/health/live',
  READINESS_PROBE_PATH: process.env.READINESS_PROBE_PATH || '/health/ready',
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30,

  // Performance Configuration
  MAX_REQUEST_SIZE: process.env.MAX_REQUEST_SIZE || '10mb',
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT) || 30000,
  KEEP_ALIVE_TIMEOUT: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000,
  COMPRESSION_ENABLED: process.env.COMPRESSION_ENABLED !== 'false',

  // Security Headers Configuration
  SECURITY_HEADERS: process.env.SECURITY_HEADERS !== 'false',
  HSTS_MAX_AGE: parseInt(process.env.HSTS_MAX_AGE) || 31536000,
  CSP_ENABLED: process.env.CSP_ENABLED !== 'false',
  CSP_POLICY: process.env.CSP_POLICY || 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'',

  // Feature Flags
  ENABLE_DEVICE_TRUST: process.env.ENABLE_DEVICE_TRUST !== 'false',
  ENABLE_CROSS_DEVICE_SHARING: process.env.ENABLE_CROSS_DEVICE_SHARING !== 'false',
  ENABLE_ENCRYPTION: process.env.ENABLE_ENCRYPTION !== 'false',
  ENABLE_AUDIT_LOGGING: process.env.ENABLE_AUDIT_LOGGING !== 'false',
  ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false',
  ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION !== 'false',
  features: {
    enableDeviceTrust: process.env.ENABLE_DEVICE_TRUST !== 'false',
    enableCrossDeviceSharing: process.env.ENABLE_CROSS_DEVICE_SHARING !== 'false',
    enableEncryption: process.env.ENABLE_ENCRYPTION !== 'false',
    enableAuditLogging: process.env.ENABLE_AUDIT_LOGGING !== 'false',
    enableRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'false',
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    enableCaching: process.env.ENABLE_CACHING !== 'false',
  },

  // Google Cloud Configuration
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'zip-myl-backend',
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  GCLOUD_REGION: process.env.GCLOUD_REGION || 'us-central1',

  // Redis Configuration (for caching and sessions)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_TTL: parseInt(process.env.REDIS_TTL) || 3600,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    ttl: parseInt(process.env.REDIS_TTL) || 3600,
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY) || 100,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES) || 3,
  },

  // Email Configuration (for notifications)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@myl.zip',

  // WebSocket Configuration
  ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET !== 'false',

  // Development Configuration
  isDevelopment() { return this.NODE_ENV === 'development'; },
  isProduction() { return this.NODE_ENV === 'production'; },
  isTest() { return this.NODE_ENV === 'test'; },

  // Validation
  validate() {
    const warnings = [];
    const errors = [];

    // Check for development defaults in production
    if (this.isProduction()) {
      if (this.JWT_SECRET === 'dev-jwt-secret-change-in-production') {
        warnings.push('JWT_SECRET is using development default');
      }
      if (this.ENCRYPTION_MASTER_KEY === 'dev-encryption-key-change-in-production') {
        warnings.push('ENCRYPTION_MASTER_KEY is using development default');
      }
      if (this.SERVICE_API_KEY === 'dev-api-key-change-in-production') {
        warnings.push('SERVICE_API_KEY is using development default');
      }
    }

    // Check for required production settings
    if (this.isProduction() && !this.DATABASE_URL) {
      errors.push('DATABASE_URL is required in production');
    }

    return { warnings, errors, isValid: errors.length === 0 };
  },
};

module.exports = config;
