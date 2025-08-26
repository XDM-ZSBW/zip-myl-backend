const { logger } = require('../utils/logger');
const deviceFingerprintingService = require('../services/deviceFingerprintingService');
const keyManagementService = require('../services/keyManagementService');
const trustService = require('../services/trustService');
const { validateDeviceRegistration, validatePairingCode } = require('../utils/validation');

/**
 * Device Registration Controller
 * Handles device registration, pairing, and trust management
 */
class DeviceRegistrationController {
  constructor() {
    this.rateLimiter = new Map(); // In production, use Redis
    this.pairingCodeExpiry = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Register a new device
   * POST /api/v1/encrypted/devices/register
   */
  async registerDevice(req, res) {
    try {
      const { deviceId, deviceInfo, publicKey, encryptedMetadata } = req.body;

      // Validate input
      const validation = validateDeviceRegistration(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid registration data',
          details: validation.errors
        });
      }

      // Rate limiting
      if (this.isRateLimited(req.ip, 'device_registration')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 3600 // 1 hour
        });
      }

      // Generate device fingerprint
      const fingerprintData = await deviceFingerprintingService.generateFingerprint(deviceInfo);
      
      // Verify device fingerprint is unique
      const existingDevice = await this.findDeviceByFingerprint(fingerprintData.fingerprint);
      if (existingDevice) {
        return res.status(409).json({
          error: 'Device already registered',
          deviceId: existingDevice.device_id
        });
      }

      // Validate public key format
      if (!this.validatePublicKey(publicKey)) {
        return res.status(400).json({
          error: 'Invalid public key format'
        });
      }

      // Create device record
      const device = await this.createDevice({
        deviceId,
        deviceInfo,
        fingerprint: fingerprintData.fingerprint,
        publicKey,
        encryptedMetadata
      });

      // Generate session token
      const sessionToken = await this.generateSessionToken(deviceId);

      // Log registration
      await this.logAuditEvent(deviceId, 'device_registered', 'device', deviceId, {
        deviceType: deviceInfo.type,
        deviceVersion: deviceInfo.version
      });

      logger.info(`Device registered successfully: ${deviceId}`);

      res.status(201).json({
        success: true,
        deviceId,
        sessionToken,
        fingerprint: fingerprintData.fingerprint,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });

    } catch (error) {
      logger.error('Device registration failed:', error);
      res.status(500).json({
        error: 'Device registration failed',
        message: error.message
      });
    }
  }

  /**
   * Generate pairing code for device
   * POST /api/v1/encrypted/devices/pairing-code
   */
  async generatePairingCode(req, res) {
    try {
      const { deviceId } = req.body;
      const authDeviceId = req.deviceId; // From middleware

      // Validate device exists and is active
      const device = await this.findDeviceById(deviceId);
      if (!device || !device.is_active) {
        return res.status(404).json({
          error: 'Device not found or inactive'
        });
      }

      // Rate limiting
      if (this.isRateLimited(deviceId, 'pairing_code')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 600 // 10 minutes
        });
      }

      // Generate pairing code
      const pairingCode = this.generatePairingCode();
      const expiresAt = new Date(Date.now() + this.pairingCodeExpiry);

      // Store pairing code
      await this.storePairingCode({
        code: pairingCode,
        deviceId,
        expiresAt
      });

      // Log pairing code generation
      await this.logAuditEvent(authDeviceId, 'pairing_code_generated', 'device', deviceId);

      logger.info(`Pairing code generated for device: ${deviceId}`);

      res.json({
        success: true,
        pairingCode,
        expiresAt: expiresAt.toISOString(),
        expiresIn: this.pairingCodeExpiry / 1000 // seconds
      });

    } catch (error) {
      logger.error('Pairing code generation failed:', error);
      res.status(500).json({
        error: 'Pairing code generation failed',
        message: error.message
      });
    }
  }

  /**
   * Pair devices using pairing code
   * POST /api/v1/encrypted/devices/pair
   */
  async pairDevices(req, res) {
    try {
      const { deviceId, pairingCode, encryptedTrustData } = req.body;
      const authDeviceId = req.deviceId; // From middleware

      // Validate input
      const validation = validatePairingCode(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Invalid pairing data',
          details: validation.errors
        });
      }

      // Rate limiting
      if (this.isRateLimited(authDeviceId, 'device_pairing')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 1800 // 30 minutes
        });
      }

      // Verify pairing code
      const pairingData = await this.verifyPairingCode(pairingCode);
      if (!pairingData) {
        return res.status(400).json({
          error: 'Invalid or expired pairing code'
        });
      }

      // Check if devices are different
      if (authDeviceId === pairingData.deviceId) {
        return res.status(400).json({
          error: 'Cannot pair device with itself'
        });
      }

      // Verify target device exists
      const targetDevice = await this.findDeviceById(pairingData.deviceId);
      if (!targetDevice || !targetDevice.is_active) {
        return res.status(404).json({
          error: 'Target device not found or inactive'
        });
      }

      // Establish trust relationship
      const trustRelationship = await trustService.establishTrust({
        sourceDeviceId: authDeviceId,
        targetDeviceId: pairingData.deviceId,
        trustLevel: 1, // Paired
        encryptedTrustData
      });

      // Mark pairing code as used
      await this.markPairingCodeUsed(pairingCode);

      // Log pairing event
      await this.logAuditEvent(authDeviceId, 'devices_paired', 'device', pairingData.deviceId);

      logger.info(`Devices paired successfully: ${authDeviceId} <-> ${pairingData.deviceId}`);

      res.json({
        success: true,
        trustRelationship: {
          id: trustRelationship.id,
          trustLevel: trustRelationship.trust_level,
          createdAt: trustRelationship.created_at
        },
        pairedDevice: {
          deviceId: pairingData.deviceId,
          deviceType: targetDevice.device_type,
          deviceVersion: targetDevice.device_version
        }
      });

    } catch (error) {
      logger.error('Device pairing failed:', error);
      res.status(500).json({
        error: 'Device pairing failed',
        message: error.message
      });
    }
  }

  /**
   * Get trusted devices
   * GET /api/v1/encrypted/devices/trusted
   */
  async getTrustedDevices(req, res) {
    try {
      const deviceId = req.deviceId; // From middleware

      // Get trusted devices
      const trustedDevices = await trustService.getTrustedDevices(deviceId);

      // Filter sensitive information
      const sanitizedDevices = trustedDevices.map(device => ({
        deviceId: device.target_device_id,
        deviceType: device.target_type,
        deviceVersion: device.target_version,
        trustLevel: device.trust_level,
        lastSeen: device.last_seen,
        createdAt: device.created_at
      }));

      res.json({
        success: true,
        devices: sanitizedDevices,
        count: sanitizedDevices.length
      });

    } catch (error) {
      logger.error('Failed to get trusted devices:', error);
      res.status(500).json({
        error: 'Failed to get trusted devices',
        message: error.message
      });
    }
  }

  /**
   * Revoke device trust
   * DELETE /api/v1/encrypted/devices/trust/{deviceId}
   */
  async revokeTrust(req, res) {
    try {
      const { deviceId: targetDeviceId } = req.params;
      const sourceDeviceId = req.deviceId; // From middleware

      // Revoke trust relationship
      const result = await trustService.revokeTrust(sourceDeviceId, targetDeviceId);

      if (!result) {
        return res.status(404).json({
          error: 'Trust relationship not found'
        });
      }

      // Log trust revocation
      await this.logAuditEvent(sourceDeviceId, 'trust_revoked', 'device', targetDeviceId);

      logger.info(`Trust revoked: ${sourceDeviceId} -> ${targetDeviceId}`);

      res.json({
        success: true,
        message: 'Trust relationship revoked successfully'
      });

    } catch (error) {
      logger.error('Trust revocation failed:', error);
      res.status(500).json({
        error: 'Trust revocation failed',
        message: error.message
      });
    }
  }

  /**
   * Update device information
   * PUT /api/v1/encrypted/devices/{deviceId}
   */
  async updateDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const { deviceInfo, publicKey, encryptedMetadata } = req.body;
      const authDeviceId = req.deviceId; // From middleware

      // Verify device ownership
      if (authDeviceId !== deviceId) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Update device information
      const updatedDevice = await this.updateDeviceInfo(deviceId, {
        deviceInfo,
        publicKey,
        encryptedMetadata
      });

      // Log device update
      await this.logAuditEvent(deviceId, 'device_updated', 'device', deviceId);

      logger.info(`Device updated: ${deviceId}`);

      res.json({
        success: true,
        device: {
          deviceId: updatedDevice.device_id,
          deviceType: updatedDevice.device_type,
          deviceVersion: updatedDevice.device_version,
          lastSeen: updatedDevice.last_seen,
          updatedAt: updatedDevice.updated_at
        }
      });

    } catch (error) {
      logger.error('Device update failed:', error);
      res.status(500).json({
        error: 'Device update failed',
        message: error.message
      });
    }
  }

  // Helper methods

  /**
   * Generate a 6-digit pairing code
   */
  generatePairingCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate public key format
   */
  validatePublicKey(publicKey) {
    try {
      // Basic PEM format validation
      return publicKey.includes('-----BEGIN PUBLIC KEY-----') && 
             publicKey.includes('-----END PUBLIC KEY-----');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check rate limiting
   */
  isRateLimited(identifier, action) {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    const window = 60 * 60 * 1000; // 1 hour

    if (!this.rateLimiter.has(key)) {
      this.rateLimiter.set(key, { count: 1, resetTime: now + window });
      return false;
    }

    const limit = this.rateLimiter.get(key);
    
    if (now > limit.resetTime) {
      this.rateLimiter.set(key, { count: 1, resetTime: now + window });
      return false;
    }

    // Rate limits per action
    const limits = {
      device_registration: 5,
      pairing_code: 10,
      device_pairing: 3
    };

    if (limit.count >= limits[action]) {
      return true;
    }

    limit.count++;
    return false;
  }

  /**
   * Database operations (to be implemented with actual database)
   */
  async findDeviceById(deviceId) {
    // TODO: Implement database query
    return null;
  }

  async findDeviceByFingerprint(fingerprint) {
    // TODO: Implement database query
    return null;
  }

  async createDevice(deviceData) {
    // TODO: Implement database insert
    return { device_id: deviceData.deviceId, ...deviceData };
  }

  async storePairingCode(pairingData) {
    // TODO: Implement database insert
    return pairingData;
  }

  async verifyPairingCode(code) {
    // TODO: Implement database query
    return null;
  }

  async markPairingCodeUsed(code) {
    // TODO: Implement database update
    return true;
  }

  async updateDeviceInfo(deviceId, updateData) {
    // TODO: Implement database update
    return { device_id: deviceId, ...updateData };
  }

  async generateSessionToken(deviceId) {
    return keyManagementService.generateSecureToken(32);
  }

  async logAuditEvent(deviceId, action, resourceType, resourceId, details = {}) {
    // TODO: Implement audit logging
    logger.info(`Audit: ${deviceId} ${action} ${resourceType}:${resourceId}`, details);
  }
}

module.exports = new DeviceRegistrationController();
