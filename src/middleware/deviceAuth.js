const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const keyManagementService = require('../services/keyManagementService');

/**
 * Device Authentication Middleware
 * Handles device authentication and authorization
 */

/**
 * Authenticate device using JWT token
 */
const authenticateDevice = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Missing authentication token',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Validate token structure
    if (!decoded.deviceId || !decoded.type || decoded.type !== 'device') {
      return res.status(401).json({
        error: 'Invalid token structure',
        code: 'INVALID_TOKEN'
      });
    }

    // Check token expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Verify device exists and is active
    const device = await verifyDeviceExists(decoded.deviceId);
    if (!device || !device.is_active) {
      return res.status(401).json({
        error: 'Device not found or inactive',
        code: 'DEVICE_INACTIVE'
      });
    }

    // Add device information to request
    req.deviceId = decoded.deviceId;
    req.device = device;
    req.token = token;

    // Update last seen timestamp
    await updateDeviceLastSeen(decoded.deviceId);

    next();
  } catch (error) {
    logger.error('Device authentication failed:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional device authentication (doesn't fail if no token)
 */
const optionalDeviceAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.deviceId = null;
      req.device = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.deviceId = null;
      req.device = null;
      return next();
    }

    // Try to verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.deviceId && decoded.type === 'device') {
      const device = await verifyDeviceExists(decoded.deviceId);
      if (device && device.is_active) {
        req.deviceId = decoded.deviceId;
        req.device = device;
        req.token = token;
        await updateDeviceLastSeen(decoded.deviceId);
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on errors
    req.deviceId = null;
    req.device = null;
    next();
  }
};

/**
 * Require specific device permissions
 */
const requireDevicePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.deviceId) {
        return res.status(401).json({
          error: 'Device authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check if device has required permission
      const hasPermission = await checkDevicePermission(req.deviceId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check failed:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Require specific trust level
 */
const requireTrustLevel = (minTrustLevel) => {
  return async (req, res, next) => {
    try {
      if (!req.deviceId) {
        return res.status(401).json({
          error: 'Device authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check device trust level
      const trustLevel = await getDeviceTrustLevel(req.deviceId);
      
      if (trustLevel < minTrustLevel) {
        return res.status(403).json({
          error: 'Insufficient trust level',
          code: 'INSUFFICIENT_TRUST',
          required: minTrustLevel,
          current: trustLevel
        });
      }

      next();
    } catch (error) {
      logger.error('Trust level check failed:', error);
      return res.status(500).json({
        error: 'Trust level check failed',
        code: 'TRUST_ERROR'
      });
    }
  };
};

/**
 * Generate device JWT token
 */
const generateDeviceToken = (deviceId, deviceInfo = {}) => {
  const payload = {
    deviceId,
    type: 'device',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    ...deviceInfo
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret');
};

/**
 * Refresh device token
 */
const refreshDeviceToken = async (req, res) => {
  try {
    if (!req.deviceId) {
      return res.status(401).json({
        error: 'Device authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const newToken = generateDeviceToken(req.deviceId, {
      deviceType: req.device?.device_type,
      deviceVersion: req.device?.device_version
    });

    res.json({
      success: true,
      token: newToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR'
    });
  }
};

// Helper functions (to be implemented with actual database)

/**
 * Verify device exists and is active
 */
async function verifyDeviceExists(deviceId) {
  // TODO: Implement database query
  // For now, return mock device
  return {
    device_id: deviceId,
    is_active: true,
    device_type: 'chrome-extension',
    device_version: '2.0.0'
  };
}

/**
 * Update device last seen timestamp
 */
async function updateDeviceLastSeen(deviceId) {
  // TODO: Implement database update
  logger.info(`Device last seen updated: ${deviceId}`);
}

/**
 * Check device permission
 */
async function checkDevicePermission(deviceId, permission) {
  // TODO: Implement permission check
  // For now, return true for all permissions
  return true;
}

/**
 * Get device trust level
 */
async function getDeviceTrustLevel(deviceId) {
  // TODO: Implement trust level check
  // For now, return level 3 (trusted)
  return 3;
}

module.exports = {
  authenticateDevice,
  optionalDeviceAuth,
  requireDevicePermission,
  requireTrustLevel,
  generateDeviceToken,
  refreshDeviceToken
};
