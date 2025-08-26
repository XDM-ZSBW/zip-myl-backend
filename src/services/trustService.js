const { logger } = require('../utils/logger');
const encryptionService = require('./encryptionService');

/**
 * Device Trust Management Service
 * Manages trusted devices and cross-device thought sharing
 */
class TrustService {
  constructor() {
    this.trustedDevices = new Map(); // In production, this would be in a database
    this.pendingPairings = new Map();
  }

  /**
   * Register a new device for a user
   */
  async registerDevice(userId, deviceInfo) {
    try {
      const deviceId = encryptionService.generateDeviceFingerprint(
        deviceInfo.userAgent,
        deviceInfo.screenResolution,
        deviceInfo.timezone
      );

      const device = {
        id: deviceId,
        userId: userId,
        name: deviceInfo.name || 'Unknown Device',
        type: deviceInfo.type || 'unknown', // 'chrome-extension', 'obsidian', 'mobile', etc.
        userAgent: deviceInfo.userAgent,
        screenResolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone,
        publicKey: deviceInfo.publicKey, // For key exchange
        isTrusted: false, // Requires explicit trust
        createdAt: new Date(),
        lastSeen: new Date(),
        permissions: {
          canRead: false,
          canWrite: false,
          canShare: false
        }
      };

      this.trustedDevices.set(deviceId, device);
      
      logger.info(`Device registered: ${deviceId} for user: ${userId}`);
      return { deviceId, requiresTrust: true };
    } catch (error) {
      logger.error('Error registering device:', error);
      throw error;
    }
  }

  /**
   * Trust a device (requires explicit user action)
   */
  async trustDevice(deviceId, trustedByDeviceId, permissions = {}) {
    try {
      const device = this.trustedDevices.get(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // Verify the trusting device is also trusted
      const trustingDevice = this.trustedDevices.get(trustedByDeviceId);
      if (!trustingDevice || !trustingDevice.isTrusted) {
        throw new Error('Trusting device is not trusted');
      }

      device.isTrusted = true;
      device.trustedBy = trustedByDeviceId;
      device.trustedAt = new Date();
      device.permissions = {
        canRead: permissions.canRead || false,
        canWrite: permissions.canWrite || false,
        canShare: permissions.canShare || false
      };

      this.trustedDevices.set(deviceId, device);
      
      logger.info(`Device trusted: ${deviceId} by ${trustedByDeviceId}`);
      return { success: true, device };
    } catch (error) {
      logger.error('Error trusting device:', error);
      throw error;
    }
  }

  /**
   * Revoke trust from a device
   */
  async revokeTrust(deviceId, revokedByDeviceId) {
    try {
      const device = this.trustedDevices.get(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      // Verify the revoking device has permission
      const revokingDevice = this.trustedDevices.get(revokedByDeviceId);
      if (!revokingDevice || !revokingDevice.isTrusted) {
        throw new Error('Revoking device is not trusted');
      }

      device.isTrusted = false;
      device.trustedBy = null;
      device.trustedAt = null;
      device.permissions = {
        canRead: false,
        canWrite: false,
        canShare: false
      };

      this.trustedDevices.set(deviceId, device);
      
      logger.info(`Trust revoked for device: ${deviceId} by ${revokedByDeviceId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error revoking trust:', error);
      throw error;
    }
  }

  /**
   * Get trusted devices for a user
   */
  async getTrustedDevices(userId) {
    try {
      const devices = Array.from(this.trustedDevices.values())
        .filter(device => device.userId === userId && device.isTrusted)
        .map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
          lastSeen: device.lastSeen,
          permissions: device.permissions
        }));

      return devices;
    } catch (error) {
      logger.error('Error getting trusted devices:', error);
      throw error;
    }
  }

  /**
   * Check if a device is trusted
   */
  async isDeviceTrusted(deviceId) {
    const device = this.trustedDevices.get(deviceId);
    return device ? device.isTrusted : false;
  }

  /**
   * Check if a device has specific permission
   */
  async hasPermission(deviceId, permission) {
    const device = this.trustedDevices.get(deviceId);
    if (!device || !device.isTrusted) {
      return false;
    }
    return device.permissions[permission] || false;
  }

  /**
   * Update device last seen timestamp
   */
  async updateLastSeen(deviceId) {
    const device = this.trustedDevices.get(deviceId);
    if (device) {
      device.lastSeen = new Date();
      this.trustedDevices.set(deviceId, device);
    }
  }

  /**
   * Generate a pairing code for device trust
   */
  async generatePairingCode(deviceId, expiresInMinutes = 10) {
    try {
      const pairingCode = encryptionService.generatePairingToken();
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      this.pendingPairings.set(pairingCode, {
        deviceId,
        expiresAt,
        createdAt: new Date()
      });

      // Auto-expire the pairing code
      setTimeout(() => {
        this.pendingPairings.delete(pairingCode);
      }, expiresInMinutes * 60 * 1000);

      return { pairingCode, expiresAt };
    } catch (error) {
      logger.error('Error generating pairing code:', error);
      throw error;
    }
  }

  /**
   * Verify and consume a pairing code
   */
  async verifyPairingCode(pairingCode, requestingDeviceId) {
    try {
      const pairing = this.pendingPairings.get(pairingCode);
      if (!pairing) {
        throw new Error('Invalid pairing code');
      }

      if (new Date() > pairing.expiresAt) {
        this.pendingPairings.delete(pairingCode);
        throw new Error('Pairing code expired');
      }

      // Remove the pairing code (one-time use)
      this.pendingPairings.delete(pairingCode);

      return {
        success: true,
        pairedDeviceId: pairing.deviceId,
        requestingDeviceId
      };
    } catch (error) {
      logger.error('Error verifying pairing code:', error);
      throw error;
    }
  }

  /**
   * Share a thought with trusted devices
   */
  async shareThoughtWithDevices(thoughtId, fromDeviceId, targetDeviceIds, permissions = {}) {
    try {
      // Verify the sharing device is trusted
      if (!(await this.isDeviceTrusted(fromDeviceId))) {
        throw new Error('Sharing device is not trusted');
      }

      // Verify all target devices are trusted
      for (const deviceId of targetDeviceIds) {
        if (!(await this.isDeviceTrusted(deviceId))) {
          throw new Error(`Target device ${deviceId} is not trusted`);
        }
      }

      // Create sharing record
      const sharingRecord = {
        thoughtId,
        fromDeviceId,
        targetDeviceIds,
        permissions: {
          canRead: permissions.canRead || false,
          canWrite: permissions.canWrite || false,
          canShare: permissions.canShare || false
        },
        sharedAt: new Date(),
        expiresAt: permissions.expiresAt || null
      };

      // In production, this would be stored in a database
      logger.info(`Thought shared: ${thoughtId} from ${fromDeviceId} to ${targetDeviceIds.join(', ')}`);
      
      return sharingRecord;
    } catch (error) {
      logger.error('Error sharing thought:', error);
      throw error;
    }
  }

  /**
   * Get shared thoughts for a device
   */
  async getSharedThoughts(deviceId) {
    try {
      // In production, this would query the database
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error getting shared thoughts:', error);
      throw error;
    }
  }
}

module.exports = new TrustService();
