const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Simple Key Management Service for Masterless Setup
 * Provides basic cryptographic functions without requiring master keys
 */
class SimpleKeyManagementService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.keyDerivationIterations = parseInt(process.env.KEY_DERIVATION_ITERATIONS) || 100000;

    // For masterless setup, we use device-specific keys
    this.keyVersion = 1;
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    this.lastKeyRotation = Date.now();

    logger.info('Simple Key Management Service initialized for masterless setup');
  }

  /**
   * Generate a new encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  deriveKeyFromPassword(password, salt, iterations = this.keyDerivationIterations) {
    return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
  }

  /**
   * Generate a secure salt
   */
  generateSalt() {
    return crypto.randomBytes(32);
  }

  /**
   * Generate a key pair for asymmetric operations
   */
  generateKeyPair(deviceId) {
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      deviceId,
      createdAt: Date.now(),
    };
  }

  /**
   * Encrypt data with a key (simplified for masterless setup)
   */
  encryptData(plaintext, key, iv = null) {
    if (!iv) {
      iv = crypto.randomBytes(this.ivLength);
    }

    try {
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm,
        keyVersion: this.keyVersion,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error encrypting data:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data with a key (simplified for masterless setup)
   */
  decryptData(encryptedData, key) {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Error decrypting data:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash data using SHA-256
   */
  hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate HMAC for data verification
   */
  generateHMAC(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data, key, expectedHMAC) {
    const actualHMAC = this.generateHMAC(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(actualHMAC, 'hex'),
      Buffer.from(expectedHMAC, 'hex'),
    );
  }

  /**
   * Generate a UUID v4
   */
  generateUUID() {
    return crypto.randomUUID();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'SimpleKeyManagementService',
      version: this.keyVersion,
      algorithm: this.algorithm,
      masterless: true,
      lastKeyRotation: this.lastKeyRotation,
      status: 'operational',
    };
  }
}

// Create singleton instance
const simpleKeyManagementService = new SimpleKeyManagementService();

module.exports = { simpleKeyManagementService };
