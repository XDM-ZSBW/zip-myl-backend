// Enhanced Rate Limiting
const enhancedRateLimiter = require('./enhancedRateLimiter');

// Extension Validation
const extensionValidation = require('./extensionValidation');

// Request Logging
const requestLogger = require('./requestLogger');

// Existing middleware
const corsConfig = require('./cors');
const rateLimiter = require('./rateLimiter');
const validation = require('./validation');
const errorHandler = require('./errorHandler');

module.exports = {
  // Enhanced Rate Limiting
  generalExtensionLimit: enhancedRateLimiter.generalExtensionLimit,
  authExtensionLimit: enhancedRateLimiter.authExtensionLimit,
  pairingCodeLimit: enhancedRateLimiter.pairingCodeLimit,
  deviceRegistrationLimit: enhancedRateLimiter.deviceRegistrationLimit,
  nftLimit: enhancedRateLimiter.nftLimit,
  smartExtensionRateLimit: enhancedRateLimiter.smartExtensionRateLimit,
  bypassExtensionRateLimit: enhancedRateLimiter.bypassExtensionRateLimit,

  // Extension Validation
  validateExtension: extensionValidation.validateExtension,
  requireExtensionPermissions: extensionValidation.requireExtensionPermissions,
  bypassRateLimitForTrusted: extensionValidation.bypassRateLimitForTrusted,
  validateExtensionId: extensionValidation.validateExtensionId,
  detectExtensionType: extensionValidation.detectExtensionType,
  isTrustedExtension: extensionValidation.isTrustedExtension,

  // Request Logging
  requestLogger: requestLogger.requestLogger,
  errorLogger: requestLogger.errorLogger,
  performanceLogger: requestLogger.performanceLogger,
  extensionAnalytics: requestLogger.extensionAnalytics,
  extractRequestInfo: requestLogger.extractRequestInfo,
  sanitizeData: requestLogger.sanitizeData,

  // Existing Middleware
  corsConfig,
  endpointRateLimit: rateLimiter.endpointRateLimit,
  sanitizeInput: validation.sanitizeInput,
  validateRequestSize: validation.validateRequestSize,
  errorHandler,
};
