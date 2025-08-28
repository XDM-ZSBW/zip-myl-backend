const { logger } = require('../utils/logger');
const encryptionService = require('./encryptionService');
const { simpleKeyManagementService: keyManagementService } = require('./simpleKeyManagementService');

/**
 * Enhanced Device Trust Management Service
 * Manages trusted devices, cross-device pairing, and key exchange
 */
class TrustService {
  constructor() {
    this.trustedDevices = new Map(); // In production, this would be in a database
    this.pendingPairings = new Map();
    this.trustLevels = {
      PAIRED: 1,
      VERIFIED: 2,
      TRUSTED: 3,
    };
    this.pairingCodeExpiry = 10 * 60 * 1000; // 10 minutes
    this.trustExpiry = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.keyExchangeExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Register a new device for a user
   */
  async registerDevice(userId, deviceInfo) {
    try {
      const deviceId = encryptionService.generateDeviceFingerprint(
        deviceInfo.userAgent,
        deviceInfo.screenResolution,
        deviceInfo.timezone,
      );

      const device = {
        id: deviceId,
        userId,
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
          canShare: false,
        },
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
        canShare: permissions.canShare || false,
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
        canShare: false,
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
          permissions: device.permissions,
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
  async generatePairingCode(deviceId, expiresInMinutes = 10, format = 'uuid') {
    try {
      const pairingCode = encryptionService.generatePairingCode(format);
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

      // Enhanced pairing record with status tracking
      const pairingRecord = {
        deviceId,
        format,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'queued',
        currentStep: 'initializing',
        message: 'Pairing code queued for generation',
        progress: 0,
        queuePosition: this.getQueuePosition(),
        nftStatus: null,
        errorDetails: null,
        retryCount: 0,
        maxRetries: 3,
      };

      this.pendingPairings.set(pairingCode, pairingRecord);

      // Simulate async generation process
      this.simulateGenerationProcess(pairingCode, pairingRecord);

      // Auto-expire the pairing code
      setTimeout(() => {
        this.pendingPairings.delete(pairingCode);
      }, expiresInMinutes * 60 * 1000);

      return { pairingCode, format, expiresAt };
    } catch (error) {
      logger.error('Error generating pairing code:', error);
      throw error;
    }
  }

  /**
   * Get detailed status of pairing code generation
   */
  async getPairingCodeStatus(pairingCode, deviceId = null) {
    try {
      const pairing = this.pendingPairings.get(pairingCode);
      
      if (!pairing) {
        return null;
      }

      // Update last activity timestamp
      pairing.lastActivityAt = new Date();
      this.pendingPairings.set(pairingCode, pairing);

      // Return enhanced status information
      return {
        ...pairing,
        status: pairing.status,
        currentStep: pairing.currentStep,
        message: pairing.message,
        progress: pairing.progress,
        queuePosition: pairing.queuePosition,
        nftStatus: pairing.nftStatus,
        errorDetails: pairing.errorDetails,
        canRetry: pairing.status === 'failed' && pairing.retryCount < pairing.maxRetries,
        retryCount: pairing.retryCount,
        maxRetries: pairing.maxRetries,
      };
    } catch (error) {
      logger.error('Error getting pairing code status:', error);
      return null;
    }
  }

  /**
   * Simulate the generation process for demo purposes
   * In production, this would be replaced with actual async processing
   */
  simulateGenerationProcess(pairingCode, pairingRecord) {
    const steps = [
      { step: 'generating_uuid', message: 'Generating unique identifier...', progress: 30, delay: 1000 },
      { step: 'creating_nft', message: 'Creating NFT artwork...', progress: 60, delay: 2000 },
      { step: 'validating_signature', message: 'Validating cryptographic signature...', progress: 80, delay: 1500 },
      { step: 'finalizing', message: 'Finalizing pairing code...', progress: 90, delay: 1000 },
      { step: 'completed', message: 'Pairing code generated successfully!', progress: 100, delay: 500 },
    ];

    let currentStepIndex = 0;

    const processStep = () => {
      if (currentStepIndex >= steps.length) {
        return;
      }

      const step = steps[currentStepIndex];
      
      // Update pairing record
      pairingRecord.status = step.step === 'completed' ? 'completed' : 'generating';
      pairingRecord.currentStep = step.step;
      pairingRecord.message = step.message;
      pairingRecord.progress = step.progress;
      pairingRecord.updatedAt = new Date();

      // Update in pending pairings
      this.pendingPairings.set(pairingCode, pairingRecord);

      currentStepIndex++;

      // Process next step after delay
      if (currentStepIndex < steps.length) {
        setTimeout(processStep, step.delay);
      }
    };

    // Start processing after a short delay
    setTimeout(processStep, 500);
  }

  /**
   * Get queue position for new pairing codes
   */
  getQueuePosition() {
    // Simple queue position calculation
    // In production, this would integrate with a proper job queue system
    const activeGenerations = Array.from(this.pendingPairings.values())
      .filter(p => p.status === 'queued' || p.status === 'generating').length;
    
    return activeGenerations > 0 ? activeGenerations : null;
  }

  /**
   * Retry failed pairing code generation
   */
  async retryPairingCodeGeneration(pairingCode, deviceId) {
    try {
      const pairing = this.pendingPairings.get(pairingCode);
      
      if (!pairing) {
        throw new Error('Pairing code not found');
      }

      if (pairing.status !== 'failed') {
        throw new Error('Can only retry failed generations');
      }

      if (pairing.retryCount >= pairing.maxRetries) {
        throw new Error('Maximum retry attempts exceeded');
      }

      // Reset status for retry
      pairing.status = 'queued';
      pairing.currentStep = 'initializing';
      pairing.message = 'Retrying pairing code generation...';
      pairing.progress = 0;
      pairing.errorDetails = null;
      pairing.retryCount++;
      pairing.updatedAt = new Date();

      // Restart generation process
      this.simulateGenerationProcess(pairingCode, pairing);

      return { success: true, message: 'Retry initiated' };
    } catch (error) {
      logger.error('Error retrying pairing code generation:', error);
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
        requestingDeviceId,
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
          canShare: permissions.canShare || false,
        },
        sharedAt: new Date(),
        expiresAt: permissions.expiresAt || null,
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

  /**
   * Establish trust relationship between devices
   */
  async establishTrust({ sourceDeviceId, targetDeviceId, trustLevel = 1, encryptedTrustData }) {
    try {
      const trustRelationship = {
        id: keyManagementService.generateSecureToken(16),
        sourceDeviceId,
        targetDeviceId,
        trustLevel,
        encryptedTrustData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In production, store in database
      logger.info(`Trust established: ${sourceDeviceId} -> ${targetDeviceId} (level: ${trustLevel})`);

      return trustRelationship;
    } catch (error) {
      logger.error('Error establishing trust:', error);
      throw error;
    }
  }

  /**
   * Get trusted devices for a device
   */
  async getTrustedDevices(deviceId) {
    try {
      // In production, query database for trust relationships
      // For now, return mock data
      return [];
    } catch (error) {
      logger.error('Error getting trusted devices:', error);
      throw error;
    }
  }

  /**
   * Revoke trust relationship
   */
  async revokeTrust(sourceDeviceId, targetDeviceId) {
    try {
      // In production, update database to mark trust as inactive
      logger.info(`Trust revoked: ${sourceDeviceId} -> ${targetDeviceId}`);

      return true;
    } catch (error) {
      logger.error('Error revoking trust:', error);
      throw error;
    }
  }

  /**
   * Verify device trust relationship
   */
  async verifyTrust(sourceDeviceId, targetDeviceId) {
    try {
      // In production, query database for active trust relationship
      // For now, return mock verification
      return {
        isTrusted: true,
        trustLevel: 1,
        verifiedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error verifying trust:', error);
      throw error;
    }
  }

  /**
   * Exchange keys between trusted devices
   */
  async exchangeKeys(sourceDeviceId, targetDeviceId, encryptedKeyData) {
    try {
      const keyExchange = {
        id: keyManagementService.generateSecureToken(16),
        sourceDeviceId,
        targetDeviceId,
        encryptedKeyData,
        exchangeType: 'initial',
        isCompleted: false,
        expiresAt: new Date(Date.now() + this.keyExchangeExpiry),
        createdAt: new Date(),
      };

      // In production, store in database
      logger.info(`Key exchange initiated: ${sourceDeviceId} <-> ${targetDeviceId}`);

      return keyExchange;
    } catch (error) {
      logger.error('Error exchanging keys:', error);
      throw error;
    }
  }

  /**
   * Complete key exchange
   */
  async completeKeyExchange(exchangeId, confirmationData) {
    try {
      // In production, update database to mark exchange as completed
      logger.info(`Key exchange completed: ${exchangeId}`);

      return {
        success: true,
        exchangeId,
        completedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error completing key exchange:', error);
      throw error;
    }
  }

  /**
   * Rotate trust keys
   */
  async rotateTrustKeys(deviceId) {
    try {
      // Generate new key pair
      const newKeyPair = keyManagementService.generateKeyPair(deviceId);

      // In production, update device record with new public key
      logger.info(`Trust keys rotated for device: ${deviceId}`);

      return {
        success: true,
        newPublicKey: newKeyPair.publicKey,
        keyId: newKeyPair.keyId,
        rotatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error rotating trust keys:', error);
      throw error;
    }
  }

  /**
   * Get trust statistics
   */
  async getTrustStatistics() {
    try {
      return {
        totalDevices: this.trustedDevices.size,
        activeTrusts: 0, // In production, query database
        pendingPairings: this.pendingPairings.size,
        trustLevels: this.trustLevels,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Error getting trust statistics:', error);
      throw error;
    }
  }
}

module.exports = new TrustService();
