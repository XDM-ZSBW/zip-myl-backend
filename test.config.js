/**
 * Test Environment Configuration
 * Safe configuration values for testing
 */

module.exports = {
  // Test Environment
  NODE_ENV: 'test',
  CI: true,
  
  // Test Database (SQLite for fast testing)
  DATABASE_URL: 'file:./test.db',
  
  // Test Redis (in-memory for testing)
  REDIS_URL: 'redis://localhost:6379',
  
  // Test JWT Secret
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  
  // Test Environment Variables
  PORT: 3001,
  HOST: 'localhost',
  
  // Disable rate limiting in tests for faster execution
  ENABLE_RATE_LIMITING: false,
  
  // Test logging level
  LOG_LEVEL: 'error',
  
  // Test file upload limits
  MAX_FILE_SIZE: 1048576,
  ALLOWED_FILE_TYPES: 'text/plain,text/markdown',
  
  // Test CORS settings
  CORS_ORIGIN: 'chrome-extension://test-extension-id',
  
  // Test security settings
  SESSION_SECRET: 'test-session-secret',
  COOKIE_SECRET: 'test-cookie-secret',
  
  // Disable external services in tests
  ENABLE_EMAIL_SERVICE: false,
  ENABLE_SMS_SERVICE: false,
  ENABLE_PUSH_NOTIFICATIONS: false,
  
  // Test monitoring
  ENABLE_METRICS: false,
  ENABLE_HEALTH_CHECKS: true,
  
  // Test timeout settings
  REQUEST_TIMEOUT: 5000,
  DATABASE_TIMEOUT: 3000,
  REDIS_TIMEOUT: 1000,
  
  // Test rate limiting
  RATE_LIMIT_WINDOW_MS: 1000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Test file paths
  UPLOAD_DIR: './test-uploads',
  LOG_DIR: './test-logs',
  
  // Test encryption
  ENCRYPTION_KEY: 'test-encryption-key-32-chars-long',
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  
  // Test API settings
  API_VERSION: 'v1',
  API_PREFIX: '/api',
  
  // Test extension settings
  EXTENSION_ID_PATTERN: /^[a-p]{32}$/,
  PAIRING_CODE_PATTERN: /^[A-Z0-9]{8}$/,
  
  // Test user settings
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_DURATION: 300000, // 5 minutes
  
  // Test thought settings
  MAX_THOUGHT_LENGTH: 10000,
  MAX_THOUGHTS_PER_USER: 1000,
  
  // Test cleanup settings
  CLEANUP_INTERVAL: 60000, // 1 minute
  MAX_LOG_AGE: 86400000, // 1 day
  MAX_UPLOAD_AGE: 604800000, // 7 days
};
