const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Secure Key Management Service
 * Handles encryption keys, key rotation, and secure key storage
 */
class KeyManagementService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.keyDerivationIterations = parseInt(process.env.KEY_DERIVATION_ITERATIONS) || 100000;

    // In production, these would be stored in a secure key management system
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY;
    this.keyVersion = 1;
    this.keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    this.lastKeyRotation = Date.now();

    if (!this.masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }
  }

  /**
   * Generate a new encryption key
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
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
   * Encrypt data with a key
   */
  encryptData(plaintext, key, iv = null) {
    if (!iv) {
      iv = crypto.randomBytes(this.ivLength);
    }

    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('myl-zip-encryption', 'utf8'));

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
  }

  /**
   * Decrypt data with a key
   */
  decryptData(encryptedData, key) {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('myl-zip-encryption', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt a key with the master key
   */
  encryptKey(key, keyId) {
    const keyData = {
      key: key.toString('hex'),
      keyId,
      createdAt: Date.now(),
      version: this.keyVersion,
    };

    return this.encryptData(JSON.stringify(keyData), Buffer.from(this.masterKey, 'hex'));
  }

  /**
   * Decrypt a key with the master key
   */
  decryptKey(encryptedKeyData) {
    const decryptedData = this.decryptData(encryptedKeyData, Buffer.from(this.masterKey, 'hex'));
    return JSON.parse(decryptedData);
  }

  /**
   * Generate a key pair for device communication with RSA-OAEP
   */
  generateKeyPair(deviceId = null) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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

    const keyId = deviceId ? this.generateKeyId(deviceId) : crypto.randomUUID();

    return {
      publicKey,
      privateKey,
      keyId,
      algorithm: 'RSA-OAEP',
      keySize: 2048,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.keyRotationInterval,
    };
  }

  /**
   * Generate a unique key ID for a device
   */
  generateKeyId(deviceId, type = 'rsa') {
    const keyData = `${deviceId}:${type}:${Date.now()}`;
    return crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
  }

  /**
   * Encrypt data with RSA-OAEP
   */
  encryptWithRSA(data, publicKey) {
    try {
      const encrypted = crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      }, Buffer.from(data, 'utf8'));

      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`RSA encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data with RSA-OAEP
   */
  decryptWithRSA(encryptedData, privateKey) {
    try {
      const decrypted = crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      }, Buffer.from(encryptedData, 'base64'));

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`RSA decryption failed: ${error.message}`);
    }
  }

  /**
   * Sign data with a private key
   */
  signData(data, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Verify data signature with a public key
   */
  verifySignature(data, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'hex');
  }

  /**
   * Generate a secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a password securely
   */
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, this.keyDerivationIterations, 64, 'sha256').toString('hex');
  }

  /**
   * Verify a password against its hash
   */
  verifyPassword(password, hash, salt) {
    const hashedPassword = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashedPassword, 'hex'));
  }

  /**
   * Create a message authentication code (MAC)
   */
  createMAC(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify a message authentication code
   */
  verifyMAC(data, key, mac) {
    const expectedMAC = this.createMAC(data, key);
    return crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expectedMAC, 'hex'));
  }

  /**
   * Check if key rotation is needed
   */
  shouldRotateKeys() {
    const timeSinceLastRotation = Date.now() - this.lastKeyRotation;
    return timeSinceLastRotation > this.keyRotationInterval;
  }

  /**
   * Rotate encryption keys
   */
  rotateKeys() {
    if (!this.shouldRotateKeys()) {
      logger.info('Key rotation not needed yet');
      return false;
    }

    logger.info('Starting key rotation...');

    // Generate new master key
    const newMasterKey = this.generateKey();

    // Update key version
    this.keyVersion += 1;
    this.lastKeyRotation = Date.now();

    // In production, this would:
    // 1. Store the new master key securely
    // 2. Re-encrypt all existing keys with the new master key
    // 3. Update the key version in the database
    // 4. Notify all services of the key rotation

    logger.info(`Key rotation completed. New key version: ${this.keyVersion}`);

    return true;
  }

  /**
   * Generate a device-specific encryption key
   */
  generateDeviceKey(deviceId, userId) {
    const deviceKeyData = {
      deviceId,
      userId,
      keyId: crypto.randomUUID(),
      createdAt: Date.now(),
      version: this.keyVersion,
    };

    const deviceKey = this.generateKey();
    const encryptedDeviceKey = this.encryptKey(deviceKey, deviceKeyData.keyId);

    return {
      keyId: deviceKeyData.keyId,
      encryptedKey: encryptedDeviceKey,
      keyData: deviceKeyData,
    };
  }

  /**
   * Derive a key from device information
   */
  deriveDeviceKey(deviceId, userId, salt) {
    const keyMaterial = `${deviceId}:${userId}:${salt}`;
    return crypto.pbkdf2Sync(keyMaterial, salt, this.keyDerivationIterations, this.keyLength, 'sha256');
  }

  /**
   * Generate a key exchange token
   */
  generateKeyExchangeToken(deviceId, targetDeviceId, expiresInMinutes = 10) {
    const tokenData = {
      deviceId,
      targetDeviceId,
      expiresAt: Date.now() + (expiresInMinutes * 60 * 1000),
      tokenId: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const token = this.generateSecureToken(32);
    const encryptedToken = this.encryptData(JSON.stringify(tokenData), Buffer.from(this.masterKey, 'hex'));

    return {
      token,
      encryptedData: encryptedToken,
      expiresAt: tokenData.expiresAt,
    };
  }

  /**
   * Verify and decrypt a key exchange token
   */
  verifyKeyExchangeToken(token, encryptedData) {
    try {
      const decryptedData = this.decryptData(encryptedData, Buffer.from(this.masterKey, 'hex'));
      const tokenData = JSON.parse(decryptedData);

      if (Date.now() > tokenData.expiresAt) {
        throw new Error('Token has expired');
      }

      return tokenData;
    } catch (error) {
      logger.error('Key exchange token verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate a backup key for key recovery
   */
  generateBackupKey() {
    const backupKey = this.generateKey();
    const backupKeyData = {
      keyId: crypto.randomUUID(),
      createdAt: Date.now(),
      version: this.keyVersion,
      purpose: 'backup',
    };

    const encryptedBackupKey = this.encryptKey(backupKey, backupKeyData.keyId);

    return {
      keyId: backupKeyData.keyId,
      encryptedKey: encryptedBackupKey,
      keyData: backupKeyData,
    };
  }

  /**
   * Validate key integrity
   */
  validateKeyIntegrity(key, expectedHash) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(keyHash, 'hex'), Buffer.from(expectedHash, 'hex'));
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
    };
  }
}

module.exports = new KeyManagementService();
