const { logger } = require('../utils/logger');

/**
 * Enhanced Request Logging Middleware
 * Provides comprehensive logging for all API requests with extension-specific details
 */

// Request logging configuration
const LOGGING_CONFIG = {
  // Log levels for different types of requests
  levels: {
    health: 'debug',      // Health checks
    auth: 'info',         // Authentication requests
    pairing: 'info',      // Pairing code operations
    nft: 'info',          // NFT operations
    device: 'info',       // Device operations
    default: 'info',       // All other requests
  },

  // Sensitive fields to redact from logs
  sensitiveFields: [
    'password',
    'token',
    'secret',
    'apiKey',
    'encryptedData',
    'privateKey',
  ],

  // Request body size limit for logging
  maxBodySize: 1024, // 1KB
};

/**
 * Determine log level based on request path
 * @param {string} path - Request path
 * @returns {string} - Log level
 */
const getLogLevel = (path) => {
  if (path.includes('/health')) return LOGGING_CONFIG.levels.health;
  if (path.includes('/auth')) return LOGGING_CONFIG.levels.auth;
  if (path.includes('/pairing') || path.includes('/device-registration')) return LOGGING_CONFIG.levels.pairing;
  if (path.includes('/nft')) return LOGGING_CONFIG.levels.nft;
  if (path.includes('/device')) return LOGGING_CONFIG.levels.device;
  return LOGGING_CONFIG.levels.default;
};

/**
 * Redact sensitive information from request data
 * @param {Object} data - Data to sanitize
 * @returns {Object} - Sanitized data
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  for (const field of LOGGING_CONFIG.sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

/**
 * Truncate large request bodies for logging
 * @param {Object} body - Request body
 * @returns {Object} - Truncated body
 */
const truncateBody = (body) => {
  if (!body) return body;

  const bodyStr = JSON.stringify(body);
  if (bodyStr.length <= LOGGING_CONFIG.maxBodySize) {
    return body;
  }

  return {
    ...body,
    _truncated: true,
    _originalSize: bodyStr.length,
    _message: 'Request body truncated for logging',
  };
};

/**
 * Extract relevant information from request
 * @param {Object} req - Express request object
 * @returns {Object} - Extracted information
 */
const extractRequestInfo = (req) => {
  const info = {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
    origin: req.headers['origin'],
    timestamp: new Date().toISOString(),
  };

  // Extension-specific information
  if (req.extensionId) {
    info.extension = {
      id: req.extensionId,
      version: req.extensionVersion,
      type: req.extensionType,
      isTrusted: req.isTrustedExtension,
    };
  }

  // Device information
  if (req.deviceId) {
    info.device = {
      id: req.deviceId,
      type: req.clientType,
    };
  }

  // Request body (sanitized and truncated)
  if (req.body && Object.keys(req.body).length > 0) {
    info.body = truncateBody(sanitizeData(req.body));
  }

  // Headers (excluding sensitive ones)
  const safeHeaders = { ...req.headers };
  delete safeHeaders.authorization;
  delete safeHeaders.cookie;
  delete safeHeaders['x-api-key'];
  info.headers = safeHeaders;

  return info;
};

/**
 * Main request logging middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestInfo = extractRequestInfo(req);
  const logLevel = getLogLevel(req.path);

  // Log incoming request
  logger.log(logLevel, 'Incoming request', requestInfo);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      responseTime: `${responseTime}ms`,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString(),
    };

    // Determine response log level based on status code
    let responseLogLevel = 'info';
    if (res.statusCode >= 400) responseLogLevel = 'warn';
    if (res.statusCode >= 500) responseLogLevel = 'error';

    // Log response
    logger.log(responseLogLevel, 'Request completed', responseInfo);

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorLogger = (error, req, res, next) => {
  const errorInfo = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    },
    request: extractRequestInfo(req),
    timestamp: new Date().toISOString(),
  };

  // Log error with request context
  logger.error('Request error occurred', errorInfo);

  next(error);
};

/**
 * Performance monitoring middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    const performanceInfo = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      extensionId: req.extensionId,
      deviceId: req.deviceId,
      timestamp: new Date().toISOString(),
    };

    // Log slow requests
    if (duration > 1000) { // 1 second threshold
      logger.warn('Slow request detected', performanceInfo);
    } else if (duration > 500) { // 500ms threshold
      logger.info('Moderate request duration', performanceInfo);
    } else {
      logger.debug('Request performance', performanceInfo);
    }
  });

  next();
};

/**
 * Extension-specific request analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const extensionAnalytics = (req, res, next) => {
  if (!req.extensionId) {
    return next();
  }

  // Track extension usage patterns
  const analyticsData = {
    extensionId: req.extensionId,
    extensionVersion: req.extensionVersion,
    extensionType: req.extensionType,
    endpoint: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };

  // Log analytics data
  logger.info('Extension request analytics', analyticsData);

  next();
};

module.exports = {
  requestLogger,
  errorLogger,
  performanceLogger,
  extensionAnalytics,
  extractRequestInfo,
  sanitizeData,
};
