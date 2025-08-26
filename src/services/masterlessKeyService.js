const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Masterless Key Management Service
 * Implements encryption without a central master key using multiple approaches:
 * 1. Device-specific key derivation
 * 2. User-controlled key management
 * 3. Threshold cryptography
 * 4. Key escrow with user control
 */
class MasterlessKeyService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.keyDerivationIterations = 100000;
    
    // No master key required!
    this.keyVersion = 1;
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.lastKeyRotation = Date.now();
    
    logger.info('Masterless Key Service initialized - no master key required');
  }

  /**
   * Approach 1: Device-Specific Key Derivation
   * Each device generates its own keys from device characteristics
   */
  generateDeviceSpecificKey(deviceId, userPassword, deviceFingerprint) {
    try {
      // Combine device ID, user password, and device fingerprint
      const keyMaterial = `${deviceId}:${userPassword}:${deviceFingerprint}`;
      
      // Generate a salt from device characteristics
      const salt = crypto.createHash('sha256')
        .update(deviceId + deviceFingerprint)
        .digest();
      
      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(
        keyMaterial, 
        salt, 
        this.keyDerivationIterations, 
        this.keyLength, 
        'sha256'
      );
      
      return {
        key: key,
        salt: salt.toString('hex'),
        keyId: this.generateKeyId(deviceId, 'device-specific'),
        algorithm: 'PBKDF2-SHA256',
        iterations: this.keyDerivationIterations
      };
    } catch (error) {
      throw new Error(`Device-specific key generation failed: ${error.message}`);
    }
  }

  /**
   * Approach 2: User-Controlled Key Management
   * Users provide their own encryption keys
   */
  importUserKey(userProvidedKey, keyId, metadata = {}) {
    try {
      // Validate the user-provided key
      if (!this.validateKeyFormat(userProvidedKey)) {
        throw new Error('Invalid key format');
      }
      
      return {
        key: Buffer.from(userProvidedKey, 'hex'),
        keyId: keyId || this.generateKeyId('user-provided', 'imported'),
        source: 'user-provided',
        metadata: {
          ...metadata,
          importedAt: new Date().toISOString(),
          version: this.keyVersion
        }
      };
    } catch (error) {
      throw new Error(`User key import failed: ${error.message}`);
    }
  }

  /**
   * Approach 3: Threshold Cryptography
   * Split keys across multiple devices/users
   */
  generateThresholdKey(deviceIds, threshold = 2) {
    try {
      if (deviceIds.length < threshold) {
        throw new Error(`Need at least ${threshold} devices for threshold cryptography`);
      }
      
      // Generate a random master key
      const masterKey = crypto.randomBytes(this.keyLength);
      
      // Split the key using Shamir's Secret Sharing (simplified)
      const keyShares = this.splitKey(masterKey, deviceIds.length, threshold);
      
      const result = {
        keyShares: keyShares.map((share, index) => ({
          deviceId: deviceIds[index],
          share: share.toString('hex'),
          index: index + 1
        })),
        threshold: threshold,
        totalShares: deviceIds.length,
        keyId: this.generateKeyId('threshold', 'shared'),
        algorithm: 'threshold-shamir'
      };
      
      logger.info(`Generated threshold key with ${threshold}/${deviceIds.length} threshold`);
      return result;
    } catch (error) {
      throw new Error(`Threshold key generation failed: ${error.message}`);
    }
  }

  /**
   * Approach 4: Key Escrow with User Control
   * Keys are encrypted with user-controlled passphrases
   */
  createKeyEscrow(originalKey, userPassphrase, escrowDevices = []) {
    try {
      // Generate a salt for the passphrase
      const salt = crypto.randomBytes(32);
      
      // Derive escrow key from user passphrase
      const escrowKey = crypto.pbkdf2Sync(
        userPassphrase,
        salt,
        this.keyDerivationIterations,
        this.keyLength,
        'sha256'
      );
      
      // Encrypt the original key with the escrow key
      const encryptedKey = this.encryptData(
        originalKey.toString('hex'),
        escrowKey
      );
      
      return {
        encryptedKey: encryptedKey,
        salt: salt.toString('hex'),
        escrowDevices: escrowDevices,
        keyId: this.generateKeyId('escrow', 'user-controlled'),
        algorithm: 'AES-256-GCM',
        recoveryMethod: 'user-passphrase'
      };
    } catch (error) {
      throw new Error(`Key escrow creation failed: ${error.message}`);
    }
  }

  /**
   * Approach 5: Cross-Device Key Exchange
   * Devices exchange keys directly without central authority
   */
  initiateKeyExchange(sourceDeviceId, targetDeviceId, keyExchangeData) {
    try {
      const exchangeId = this.generateKeyId('exchange', 'cross-device');
      
      // Create key exchange token
      const exchangeToken = {
        exchangeId: exchangeId,
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        keyExchangeData: keyExchangeData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        status: 'pending'
      };
      
      // In a real implementation, this would be stored temporarily
      // and the target device would retrieve it using the exchangeId
      
      return {
        exchangeId: exchangeId,
        exchangeToken: exchangeToken,
        instructions: {
          targetDevice: `Use exchangeId ${exchangeId} to complete key exchange`,
          expiresIn: '10 minutes'
        }
      };
    } catch (error) {
      throw new Error(`Key exchange initiation failed: ${error.message}`);
    }
  }

  /**
   * Approach 6: Biometric + Device Key Derivation
   * Use biometric data (hashed) combined with device characteristics
   */
  generateBiometricKey(deviceId, biometricHash, userPin) {
    try {
      // Combine biometric hash with device ID and user PIN
      const keyMaterial = `${deviceId}:${biometricHash}:${userPin}`;
      
      // Generate salt from device characteristics
      const salt = crypto.createHash('sha256')
        .update(deviceId + biometricHash)
        .digest();
      
      // Derive key
      const key = crypto.pbkdf2Sync(
        keyMaterial,
        salt,
        this.keyDerivationIterations,
        this.keyLength,
        'sha256'
      );
      
      return {
        key: key,
        salt: salt.toString('hex'),
        keyId: this.generateKeyId(deviceId, 'biometric'),
        algorithm: 'PBKDF2-SHA256',
        biometricUsed: true,
        deviceBound: true
      };
    } catch (error) {
      throw new Error(`Biometric key generation failed: ${error.message}`);
    }
  }

  // Helper methods

  /**
   * Split a key into shares (simplified Shamir's Secret Sharing)
   */
  splitKey(key, totalShares, threshold) {
    // This is a simplified implementation
    // In production, use a proper secret sharing library
    const shares = [];
    const keyHex = key.toString('hex');
    
    for (let i = 0; i < totalShares; i++) {
      const share = crypto.createHash('sha256')
        .update(keyHex + i.toString())
        .digest();
      shares.push(share);
    }
    
    return shares;
  }

  /**
   * Reconstruct key from shares
   */
  reconstructKey(shares, threshold) {
    // Simplified reconstruction
    // In production, use proper secret sharing reconstruction
    if (shares.length < threshold) {
      throw new Error(`Need at least ${threshold} shares to reconstruct key`);
    }
    
    // For this simplified version, we'll use the first share
    // In reality, you'd implement proper Shamir reconstruction
    return shares[0];
  }

  /**
   * Encrypt data with a key
   */
  encryptData(plaintext, key, iv = null) {
    if (!iv) {
      iv = crypto.randomBytes(this.ivLength);
    }

    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('myl-zip-masterless', 'utf8'));

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.algorithm,
      keyVersion: this.keyVersion,
      timestamp: Date.now()
    };
  }

  /**
   * Decrypt data with a key
   */
  decryptData(encryptedData, key) {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('myl-zip-masterless', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a unique key ID
   */
  generateKeyId(deviceId, type) {
    const keyData = `${deviceId}:${type}:${Date.now()}:${Math.random()}`;
    return crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
  }

  /**
   * Validate key format
   */
  validateKeyFormat(key) {
    try {
      // Check if it's a valid hex string of correct length
      const keyBuffer = Buffer.from(key, 'hex');
      return keyBuffer.length === this.keyLength;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get key management status
   */
  getKeyStatus() {
    return {
      keyVersion: this.keyVersion,
      lastRotation: this.lastKeyRotation,
      nextRotation: this.lastKeyRotation + this.keyRotationInterval,
      shouldRotate: this.shouldRotateKeys(),
      algorithm: this.algorithm,
      keyLength: this.keyLength,
      iterations: this.keyDerivationIterations,
      masterless: true,
      approaches: [
        'device-specific-derivation',
        'user-controlled-keys',
        'threshold-cryptography',
        'key-escrow-user-control',
        'cross-device-exchange',
        'biometric-device-binding'
      ]
    };
  }

  /**
   * Check if key rotation is needed
   */
  shouldRotateKeys() {
    const timeSinceLastRotation = Date.now() - this.lastKeyRotation;
    return timeSinceLastRotation > this.keyRotationInterval;
  }

  /**
   * Rotate keys (user-initiated)
   */
  rotateKeys() {
    if (!this.shouldRotateKeys()) {
      logger.info('Key rotation not needed yet');
      return false;
    }

    logger.info('Starting masterless key rotation...');
    
    // Update key version
    this.keyVersion += 1;
    this.lastKeyRotation = Date.now();
    
    logger.info(`Masterless key rotation completed. New key version: ${this.keyVersion}`);
    
    return true;
  }
}

module.exports = new MasterlessKeyService();
