// Enhanced Rate Limiting
const {
  generalExtensionLimit,
  authExtensionLimit,
  pairingCodeLimit,
  deviceRegistrationLimit,
  nftLimit,
  smartExtensionRateLimit,
  bypassExtensionRateLimit,
} = require('./enhancedRateLimiter');

// Extension Validation
const {
  validateExtension,
  requireExtensionPermissions,
  bypassRateLimitForTrusted,
  validateExtensionId,
  detectExtensionType,
  isTrustedExtension,
} = require('./extensionValidation');

// Request Logging
const {
  requestLogger,
  errorLogger,
  performanceLogger,
  extensionAnalytics,
  extractRequestInfo,
  sanitizeData,
} = require('./requestLogger');

// Existing middleware
const { corsConfig } = require('./cors');
const { endpointRateLimit } = require('./rateLimiter');
const { sanitizeInput, validateRequestSize } = require('./validation');
const { errorHandler } = require('./errorHandler');

module.exports = {
  // Enhanced Rate Limiting
  generalExtensionLimit,
  authExtensionLimit,
  pairingCodeLimit,
  deviceRegistrationLimit,
  nftLimit,
  smartExtensionRateLimit,
  bypassExtensionRateLimit,

  // Extension Validation
  validateExtension,
  requireExtensionPermissions,
  bypassRateLimitForTrusted,
  validateExtensionId,
  detectExtensionType,
  isTrustedExtension,

  // Request Logging
  requestLogger,
  errorLogger,
  performanceLogger,
  extensionAnalytics,
  extractRequestInfo,
  sanitizeData,

  // Existing Middleware
  corsConfig,
  endpointRateLimit,
  sanitizeInput,
  validateRequestSize,
  errorHandler,
};
