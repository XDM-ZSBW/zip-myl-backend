const { logger } = require('../utils/logger');
const crypto = require('crypto');

/**
 * Audit Logger Middleware
 * Logs security-relevant events for compliance and monitoring
 */
const auditLogger = (req, res, next) => {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') {
    return next();
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Add request ID to request object
  req.requestId = requestId;
  req.startTime = startTime;

  // Log request details
  const auditData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    deviceId: req.headers['x-device-id'],
    userId: req.headers['x-user-id'],
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    origin: req.get('Origin'),
  };

  // Log sensitive operations
  const sensitiveEndpoints = [
    '/api/v1/encrypted/thoughts',
    '/api/v1/encrypted/devices',
    '/api/v1/encrypted/share',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
  ];

  const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint =>
    req.url.startsWith(endpoint),
  );

  if (isSensitiveEndpoint) {
    logger.info('Audit: Sensitive endpoint accessed', auditData);
  }

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseData = {
      ...auditData,
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('Content-Length') || 0,
      endTime: new Date().toISOString(),
    };

    // Log based on status code
    if (res.statusCode >= 400) {
      logger.warn('Audit: Error response', responseData);
    } else if (isSensitiveEndpoint) {
      logger.info('Audit: Sensitive operation completed', responseData);
    }

    // Log security events
    if (res.statusCode === 401) {
      logger.warn('Audit: Unauthorized access attempt', responseData);
    } else if (res.statusCode === 403) {
      logger.warn('Audit: Forbidden access attempt', responseData);
    } else if (res.statusCode === 429) {
      logger.warn('Audit: Rate limit exceeded', responseData);
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Log security events
 */
const logSecurityEvent = (eventType, details) => {
  if (process.env.ENABLE_AUDIT_LOGGING !== 'true') {
    return;
  }

  const securityEvent = {
    eventType,
    timestamp: new Date().toISOString(),
    severity: getSeverityLevel(eventType),
    ...details,
  };

  logger.info('Security Event', securityEvent);
};

/**
 * Get severity level for security events
 */
const getSeverityLevel = (eventType) => {
  const severityMap = {
    'LOGIN_SUCCESS': 'info',
    'LOGIN_FAILURE': 'warn',
    'DEVICE_REGISTRATION': 'info',
    'DEVICE_TRUST': 'info',
    'DEVICE_TRUST_REVOKED': 'warn',
    'ENCRYPTION_KEY_ROTATION': 'info',
    'RATE_LIMIT_EXCEEDED': 'warn',
    'UNAUTHORIZED_ACCESS': 'error',
    'INVALID_TOKEN': 'warn',
    'SUSPICIOUS_ACTIVITY': 'error',
    'DATA_BREACH_ATTEMPT': 'error',
  };

  return severityMap[eventType] || 'info';
};

/**
 * Log device trust events
 */
const logDeviceTrustEvent = (eventType, deviceId, userId, details = {}) => {
  logSecurityEvent(eventType, {
    deviceId,
    userId,
    ...details,
  });
};

/**
 * Log encryption events
 */
const logEncryptionEvent = (eventType, details = {}) => {
  logSecurityEvent(eventType, details);
};

/**
 * Log authentication events
 */
const logAuthEvent = (eventType, userId, deviceId, details = {}) => {
  logSecurityEvent(eventType, {
    userId,
    deviceId,
    ...details,
  });
};

module.exports = {
  auditLogger,
  logSecurityEvent,
  logDeviceTrustEvent,
  logEncryptionEvent,
  logAuthEvent,
};
