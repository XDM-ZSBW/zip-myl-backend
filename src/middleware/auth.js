const deviceAuth = require('../auth/deviceAuth');
const apiKeyValidator = require('./apiKeyValidator');
const { logger } = require('../utils/logger');

/**
 * Authentication middleware for device-based authentication
 */
const authenticateDevice = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Bearer token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const validation = await deviceAuth.validateToken(token);

    if (!validation.isValid) {
      logger.warn('Invalid device token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        error: validation.error
      });

      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }

    // Attach device info to request
    req.deviceId = validation.deviceId;
    req.sessionId = validation.sessionId;

    // Get device information
    try {
      const deviceInfo = await deviceAuth.getDeviceInfo(validation.deviceId);
      req.device = deviceInfo;
    } catch (error) {
      logger.error('Error getting device info', { error: error.message });
      // Continue without device info
    }

    next();
  } catch (error) {
    logger.error('Error in device authentication', { error: error.message });
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional device authentication (doesn't fail if no token provided)
 */
const authenticateDeviceOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.deviceId = null;
      req.sessionId = null;
      req.device = null;
      return next();
    }

    const token = authHeader.substring(7);
    const validation = await deviceAuth.validateToken(token);

    if (validation.isValid) {
      req.deviceId = validation.deviceId;
      req.sessionId = validation.sessionId;

      try {
        const deviceInfo = await deviceAuth.getDeviceInfo(validation.deviceId);
        req.device = deviceInfo;
      } catch (error) {
        logger.error('Error getting device info', { error: error.message });
      }
    } else {
      req.deviceId = null;
      req.sessionId = null;
      req.device = null;
    }

    next();
  } catch (error) {
    logger.error('Error in optional device authentication', { error: error.message });
    req.deviceId = null;
    req.sessionId = null;
    req.device = null;
    next();
  }
};

/**
 * Require API key authentication
 */
const requireApiKey = apiKeyValidator.validateApiKey;

/**
 * Optional API key authentication
 */
const optionalApiKey = apiKeyValidator.validateOptionalApiKey;

/**
 * Require specific permissions
 */
const requirePermissions = (permissions) => {
  return apiKeyValidator.requirePermissions(permissions);
};

/**
 * Require specific client type
 */
const requireClientType = (clientType) => {
  return apiKeyValidator.requireClientType(clientType);
};

/**
 * Require specific role
 */
const requireRole = (role) => {
  return apiKeyValidator.requireRole(role);
};

/**
 * Combined authentication: Device OR API Key
 */
const authenticateDeviceOrApiKey = async (req, res, next) => {
  try {
    // Check for API key first
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return apiKeyValidator.validateApiKey(req, res, next);
    }

    // Fall back to device authentication
    return authenticateDevice(req, res, next);
  } catch (error) {
    logger.error('Error in combined authentication', { error: error.message });
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Require admin role (for admin endpoints)
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Check if API key has admin role
    if (req.apiKey && req.apiKeyRole === 'admin') {
      return next();
    }

    // Check if device has admin privileges (this would need to be implemented)
    if (req.device && req.device.role === 'admin') {
      return next();
    }

    return res.status(403).json({
      error: 'Admin access required',
      message: 'This endpoint requires admin privileges'
    });
  } catch (error) {
    logger.error('Error in admin authentication', { error: error.message });
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Rate limit based on authentication type
 */
const rateLimitByAuth = (req, res, next) => {
  // This would integrate with your rate limiting system
  // Different rate limits for different authentication types
  
  if (req.apiKey) {
    req.rateLimitType = 'api_key';
    req.rateLimitKey = `api_key:${req.apiKey.id}`;
  } else if (req.deviceId) {
    req.rateLimitType = 'device';
    req.rateLimitKey = `device:${req.deviceId}`;
  } else {
    req.rateLimitType = 'anonymous';
    req.rateLimitKey = `ip:${req.ip}`;
  }

  next();
};

/**
 * Log authentication events
 */
const logAuthEvent = (action) => {
  return async (req, res, next) => {
    try {
      const logData = {
        action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        deviceId: req.deviceId,
        apiKeyId: req.apiKey?.id,
        success: true
      };

      logger.info('Authentication event', logData);
      next();
    } catch (error) {
      logger.error('Error logging auth event', { error: error.message });
      next();
    }
  };
};

module.exports = {
  authenticateDevice,
  authenticateDeviceOptional,
  requireApiKey,
  optionalApiKey,
  requirePermissions,
  requireClientType,
  requireRole,
  authenticateDeviceOrApiKey,
  requireAdmin,
  rateLimitByAuth,
  logAuthEvent
};