const deviceAuth = require('../auth/deviceAuth');
const sessionManager = require('../auth/sessionManager');
const { logger } = require('../utils/logger');

class AuthController {
  /**
   * Register a new device
   */
  async registerDevice(req, res) {
    try {
      const result = await deviceAuth.registerDevice(req);
      
      logger.info('Device registered successfully', {
        deviceId: result.deviceId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        data: {
          deviceId: result.deviceId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          refreshExpiresIn: result.refreshExpiresIn
        }
      });
    } catch (error) {
      logger.error('Error registering device', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to register device',
        message: error.message
      });
    }
  }

  /**
   * Login device (refresh tokens)
   */
  async login(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required',
          message: 'Refresh token is required for login'
        });
      }

      const result = await deviceAuth.refreshToken(refreshToken, req);
      
      logger.info('Device logged in successfully', {
        deviceId: result.deviceId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          deviceId: result.deviceId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          refreshExpiresIn: result.refreshExpiresIn
        }
      });
    } catch (error) {
      logger.error('Error during login', { error: error.message });
      res.status(401).json({
        success: false,
        error: 'Login failed',
        message: error.message
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required',
          message: 'Refresh token is required'
        });
      }

      const result = await deviceAuth.refreshToken(refreshToken, req);
      
      logger.info('Token refreshed successfully', {
        deviceId: result.deviceId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          deviceId: result.deviceId,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          refreshExpiresIn: result.refreshExpiresIn
        }
      });
    } catch (error) {
      logger.error('Error refreshing token', { error: error.message });
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: error.message
      });
    }
  }

  /**
   * Logout device
   */
  async logout(req, res) {
    try {
      const deviceId = req.deviceId;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required for logout'
        });
      }

      await deviceAuth.logout(deviceId);
      
      logger.info('Device logged out successfully', {
        deviceId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Error during logout', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: error.message
      });
    }
  }

  /**
   * Validate token
   */
  async validateToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({
          success: false,
          error: 'Token required',
          message: 'Bearer token is required'
        });
      }

      const token = authHeader.substring(7);
      const validation = await deviceAuth.validateToken(token);

      if (!validation.isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: validation.error
        });
      }

      res.json({
        success: true,
        message: 'Token is valid',
        data: {
          deviceId: validation.deviceId,
          sessionId: validation.sessionId,
          isValid: true
        }
      });
    } catch (error) {
      logger.error('Error validating token', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Token validation failed',
        message: error.message
      });
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(req, res) {
    try {
      const deviceId = req.deviceId;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required'
        });
      }

      const deviceInfo = await deviceAuth.getDeviceInfo(deviceId);
      
      res.json({
        success: true,
        message: 'Device information retrieved successfully',
        data: deviceInfo
      });
    } catch (error) {
      logger.error('Error getting device info', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get device information',
        message: error.message
      });
    }
  }

  /**
   * Update device information
   */
  async updateDevice(req, res) {
    try {
      const deviceId = req.deviceId;
      const updateData = req.body;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required'
        });
      }

      // Remove sensitive fields that shouldn't be updated
      delete updateData.id;
      delete updateData.fingerprint;
      delete updateData.createdAt;

      const updatedDevice = await deviceAuth.updateDevice(deviceId, updateData);
      
      logger.info('Device updated successfully', {
        deviceId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Device updated successfully',
        data: updatedDevice
      });
    } catch (error) {
      logger.error('Error updating device', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to update device',
        message: error.message
      });
    }
  }

  /**
   * Revoke device access
   */
  async revokeDevice(req, res) {
    try {
      const deviceId = req.deviceId;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required'
        });
      }

      await deviceAuth.revokeDevice(deviceId);
      
      logger.info('Device access revoked successfully', {
        deviceId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Device access revoked successfully'
      });
    } catch (error) {
      logger.error('Error revoking device access', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke device access',
        message: error.message
      });
    }
  }

  /**
   * Get device sessions
   */
  async getDeviceSessions(req, res) {
    try {
      const deviceId = req.deviceId;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required'
        });
      }

      const sessions = await sessionManager.getDeviceSessions(deviceId);
      
      res.json({
        success: true,
        message: 'Device sessions retrieved successfully',
        data: sessions
      });
    } catch (error) {
      logger.error('Error getting device sessions', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get device sessions',
        message: error.message
      });
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(req, res) {
    try {
      const stats = await sessionManager.getSessionStats();
      
      res.json({
        success: true,
        message: 'Session statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      logger.error('Error getting session stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get session statistics',
        message: error.message
      });
    }
  }
}

module.exports = new AuthController();
