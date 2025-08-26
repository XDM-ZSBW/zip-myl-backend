const { logger } = require('../utils/logger');
const trustService = require('../services/trustService');
const encryptionService = require('../services/encryptionService');

/**
 * Device Trust Controller
 * Manages device registration, trust, and cross-device sharing
 */
class DeviceTrustController {
  constructor() {
    this.users = new Map(); // In production, this would be a database
  }

  /**
   * Register a new device
   */
  async registerDevice(req, res) {
    try {
      const { userId, deviceInfo } = req.body;

      if (!userId || !deviceInfo) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId and deviceInfo are required'
        });
      }

      const result = await trustService.registerDevice(userId, deviceInfo);

      res.status(201).json({
        success: true,
        deviceId: result.deviceId,
        requiresTrust: result.requiresTrust,
        message: 'Device registered successfully. Trust required before use.'
      });

    } catch (error) {
      logger.error('Error registering device:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to register device'
      });
    }
  }

  /**
   * Trust a device
   */
  async trustDevice(req, res) {
    try {
      const { deviceId, trustedByDeviceId, permissions } = req.body;

      if (!deviceId || !trustedByDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId and trustedByDeviceId are required'
        });
      }

      const result = await trustService.trustDevice(deviceId, trustedByDeviceId, permissions);

      res.json({
        success: true,
        device: result.device,
        message: 'Device trusted successfully'
      });

    } catch (error) {
      logger.error('Error trusting device:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to trust device'
      });
    }
  }

  /**
   * Revoke trust from a device
   */
  async revokeTrust(req, res) {
    try {
      const { deviceId, revokedByDeviceId } = req.body;

      if (!deviceId || !revokedByDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId and revokedByDeviceId are required'
        });
      }

      const result = await trustService.revokeTrust(deviceId, revokedByDeviceId);

      res.json({
        success: true,
        message: 'Device trust revoked successfully'
      });

    } catch (error) {
      logger.error('Error revoking trust:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to revoke trust'
      });
    }
  }

  /**
   * Get trusted devices for a user
   */
  async getTrustedDevices(req, res) {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;

      // Verify requesting device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted'
        });
      }

      const devices = await trustService.getTrustedDevices(userId);

      res.json({
        success: true,
        devices,
        message: 'Trusted devices retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting trusted devices:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get trusted devices'
      });
    }
  }

  /**
   * Generate a pairing code for device trust
   */
  async generatePairingCode(req, res) {
    try {
      const { deviceId, format = 'uuid', expiresInMinutes = 10 } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId is required'
        });
      }

      // Validate format parameter
      if (format && !['uuid', 'short', 'legacy'].includes(format.toLowerCase())) {
        return res.status(400).json({
          error: 'Invalid format parameter',
          message: 'Format must be "uuid", "short", or "legacy"'
        });
      }

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to generate pairing codes'
        });
      }

      const result = await trustService.generatePairingCode(deviceId, expiresInMinutes, format.toLowerCase());

      res.json({
        success: true,
        pairingCode: result.pairingCode,
        format: result.format,
        expiresAt: result.expiresAt,
        message: 'Pairing code generated successfully'
      });

    } catch (error) {
      logger.error('Error generating pairing code:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate pairing code'
      });
    }
  }

  /**
   * Verify a pairing code
   */
  async verifyPairingCode(req, res) {
    try {
      const { pairingCode, requestingDeviceId } = req.body;

      if (!pairingCode || !requestingDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'pairingCode and requestingDeviceId are required'
        });
      }

      const result = await trustService.verifyPairingCode(pairingCode, requestingDeviceId);

      res.json({
        success: true,
        pairedDeviceId: result.pairedDeviceId,
        requestingDeviceId: result.requestingDeviceId,
        message: 'Pairing code verified successfully'
      });

    } catch (error) {
      logger.error('Error verifying pairing code:', error);
      res.status(400).json({
        error: 'Invalid pairing code',
        message: error.message
      });
    }
  }

  /**
   * Share a thought with trusted devices
   */
  async shareThought(req, res) {
    try {
      const { thoughtId, fromDeviceId, targetDeviceIds, permissions } = req.body;

      if (!thoughtId || !fromDeviceId || !targetDeviceIds || !Array.isArray(targetDeviceIds)) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'thoughtId, fromDeviceId, and targetDeviceIds array are required'
        });
      }

      const result = await trustService.shareThoughtWithDevices(
        thoughtId,
        fromDeviceId,
        targetDeviceIds,
        permissions
      );

      res.json({
        success: true,
        sharingRecord: result,
        message: 'Thought shared successfully with trusted devices'
      });

    } catch (error) {
      logger.error('Error sharing thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to share thought'
      });
    }
  }

  /**
   * Get shared thoughts for a device
   */
  async getSharedThoughts(req, res) {
    try {
      const { deviceId } = req.params;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted'
        });
      }

      const sharedThoughts = await trustService.getSharedThoughts(deviceId);

      res.json({
        success: true,
        sharedThoughts,
        message: 'Shared thoughts retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting shared thoughts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get shared thoughts'
      });
    }
  }

  /**
   * Check device trust status
   */
  async checkDeviceTrust(req, res) {
    try {
      const { deviceId } = req.params;

      const isTrusted = await trustService.isDeviceTrusted(deviceId);
      const permissions = isTrusted ? {
        canRead: await trustService.hasPermission(deviceId, 'canRead'),
        canWrite: await trustService.hasPermission(deviceId, 'canWrite'),
        canShare: await trustService.hasPermission(deviceId, 'canShare')
      } : null;

      res.json({
        success: true,
        deviceId,
        isTrusted,
        permissions,
        message: isTrusted ? 'Device is trusted' : 'Device is not trusted'
      });

    } catch (error) {
      logger.error('Error checking device trust:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check device trust'
      });
    }
  }
}

module.exports = new DeviceTrustController();
