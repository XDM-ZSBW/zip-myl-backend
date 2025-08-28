const crypto = require('crypto');
const { logger } = require('../utils/logger');

class NFTEncryptionService {
  constructor() {
    // Use environment variable for encryption key or generate a default one
    this.encryptionKey = process.env.NFT_ENCRYPTION_KEY || 
                         process.env.ENCRYPTION_KEY || 
                         'default-nft-encryption-key-32-chars';
    
    // Ensure key is 32 bytes for AES-256
    if (this.encryptionKey.length < 32) {
      this.encryptionKey = this.encryptionKey.padEnd(32, '0');
    } else if (this.encryptionKey.length > 32) {
      this.encryptionKey = this.encryptionKey.substring(0, 32);
    }

    // Use environment variable for IV or generate a default one
    this.iv = process.env.NFT_ENCRYPTION_IV || 
               process.env.ENCRYPTION_IV || 
               'default-iv-16-chars';
    
    // Ensure IV is 16 bytes
    if (this.iv.length < 16) {
      this.iv = this.iv.padEnd(16, '0');
    } else if (this.iv.length > 16) {
      this.iv = this.iv.substring(0, 16);
    }

    logger.info('NFT Encryption Service initialized');
  }

  /**
   * Encrypt data using AES-256-CBC
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data (base64 encoded)
   */
  async encrypt(data) {
    try {
      if (!data) {
        throw new Error('Data cannot be empty');
      }

      // Convert data to string if it's not already
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Create a random IV for this encryption
      const randomIV = crypto.randomBytes(16);
      
      // Create cipher with IV
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), randomIV);
      
      // Encrypt the data
      let encrypted = cipher.update(dataString, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const result = randomIV.toString('hex') + ':' + encrypted;
      
      logger.debug('Data encrypted successfully');
      return result;
    } catch (error) {
      logger.error(`Encryption failed: ${error.message}`);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-CBC
   * @param {string} encryptedData - Encrypted data (base64 encoded)
   * @returns {string} Decrypted data
   */
  async decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('Encrypted data cannot be empty');
      }

      // Split IV and encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      // Create decipher with IV
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Data decrypted successfully');
      return decrypted;
    } catch (error) {
      logger.error(`Decryption failed: ${error.message}`);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a hash for data integrity
   * @param {string} data - Data to hash
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {string} Hash value
   */
  async hash(data, algorithm = 'sha256') {
    try {
      if (!data) {
        throw new Error('Data cannot be empty');
      }

      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const hash = crypto.createHash(algorithm);
      hash.update(dataString);
      
      return hash.digest('hex');
    } catch (error) {
      logger.error(`Hashing failed: ${error.message}`);
      throw new Error(`Hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate a random token
   * @param {number} length - Token length in bytes (default: 32)
   * @returns {string} Random token (hex encoded)
   */
  async generateToken(length = 32) {
    try {
      const token = crypto.randomBytes(length);
      return token.toString('hex');
    } catch (error) {
      logger.error(`Token generation failed: ${error.message}`);
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify data integrity using hash
   * @param {string} data - Original data
   * @param {string} hash - Expected hash value
   * @param {string} algorithm - Hash algorithm (default: sha256)
   * @returns {boolean} Integrity verification result
   */
  async verifyHash(data, hash, algorithm = 'sha256') {
    try {
      const calculatedHash = await this.hash(data, algorithm);
      return calculatedHash === hash;
    } catch (error) {
      logger.error(`Hash verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get encryption service status
   * @returns {Object} Service status
   */
  async getStatus() {
    try {
      return {
        status: 'healthy',
        algorithm: 'AES-256-CBC',
        keyLength: this.encryptionKey.length,
        ivLength: this.iv.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Error getting encryption service status: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Change encryption key (for key rotation)
   * @param {string} newKey - New encryption key
   * @returns {boolean} Success status
   */
  async changeKey(newKey) {
    try {
      if (!newKey || newKey.length < 32) {
        throw new Error('New key must be at least 32 characters long');
      }

      // Ensure key is 32 bytes
      if (newKey.length < 32) {
        newKey = newKey.padEnd(32, '0');
      } else if (newKey.length > 32) {
        newKey = newKey.substring(0, 32);
      }

      this.encryptionKey = newKey;
      logger.info('Encryption key changed successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to change encryption key: ${error.message}`);
      return false;
    }
  }
}

// Create singleton instance
const nftEncryptionService = new NFTEncryptionService();

module.exports = { nftEncryptionService };
