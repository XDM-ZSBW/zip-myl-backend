const crypto = require('crypto');

/**
 * End-to-End Encryption Service
 * Handles encrypted data storage without server-side decryption capability
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a new encryption key for a user
   * This should be called on the client side, never on the server
   */
  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate a key derivation salt
   */
  generateSalt() {
    return crypto.randomBytes(32);
  }

  /**
   * Derive a key from a password using PBKDF2
   * This allows users to recover their key with a password
   */
  deriveKeyFromPassword(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
  }

  /**
   * Encrypt data (client-side only - server never calls this)
   * This is provided as a reference for client implementation
   */
  encryptData(plaintext, key, iv = null) {
    if (!iv) {
      iv = crypto.randomBytes(this.ivLength);
    }

    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from('myl-zip-thought', 'utf8'));

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      algorithm: this.algorithm,
    };
  }

  /**
   * Decrypt data (client-side only - server never calls this)
   * This is provided as a reference for client implementation
   */
  decryptData(encryptedData, key) {
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(Buffer.from('myl-zip-thought', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a device fingerprint for trust management
   */
  generateDeviceFingerprint(userAgent, screenResolution, timezone) {
    const fingerprint = `${userAgent}-${screenResolution}-${timezone}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Generate a secure random token for device pairing
   */
  generatePairingToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a UUID v4 pairing code
   */
  generateUUIDPairingCode() {
    return crypto.randomUUID();
  }

  /**
   * Generate a short format pairing code (12-character hex)
   */
  generateShortPairingCode() {
    return crypto.randomBytes(6).toString('hex');
  }

  /**
   * Generate pairing code based on format
   */
  generatePairingCode(format = 'uuid') {
    switch (format.toLowerCase()) {
    case 'uuid':
      return this.generateUUIDPairingCode();
    case 'short':
      return this.generateShortPairingCode();
    case 'legacy':
      return this.generateLegacyPairingCode();
    default:
      return this.generateUUIDPairingCode(); // Default to UUID
    }
  }

  /**
   * Generate a legacy 6-digit numeric pairing code
   */
  generateLegacyPairingCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash a password for secure storage
   */
  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  }

  /**
   * Verify a password against its hash
   */
  verifyPassword(password, hash, salt) {
    const hashedPassword = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashedPassword, 'hex'));
  }

  /**
   * Generate a secure session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a message authentication code (MAC) for data integrity
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
}

module.exports = new EncryptionService();
