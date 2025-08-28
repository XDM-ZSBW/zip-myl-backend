const crypto = require('crypto');
const logger = require('../utils/logger');
const { nftDatabaseService } = require('./nftDatabaseService');
const { nftCacheService } = require('./nftCacheService');
const { nftEncryptionService } = require('./nftEncryptionService');

class PairingService {
  constructor() {
    this.db = nftDatabaseService;
    this.cache = nftCacheService;
    this.encryption = nftEncryptionService;
  }

  /**
   * Validate NFT pairing token and process the pairing
   * @param {string} token - The pairing token
   * @param {Object} nftData - The NFT data to pair
   * @param {string} userId - The user's device ID
   * @returns {Object} Pairing validation result
   */
  async validatePairing(token, nftData, userId) {
    try {
      // First check cache for quick validation
      const cachedToken = await this.cache.get(`pairing_token:${token}`);

      if (!cachedToken) {
        // Check database for token
        const tokenResult = await this.validateTokenFromDatabase(token);
        if (!tokenResult) {
          throw new Error('Invalid or expired pairing token');
        }
      }

      // Validate token details
      const tokenDetails = cachedToken || await this.getTokenDetails(token);

      if (!tokenDetails) {
        throw new Error('Token not found');
      }

      // Check if token is expired
      if (new Date(tokenDetails.expiresAt) < new Date()) {
        throw new Error('Pairing token has expired');
      }

      // Check if token is already used
      if (tokenDetails.usedAt) {
        throw new Error('Pairing token has already been used');
      }

      // Validate NFT data structure
      const validationResult = await this.validateNFTData(nftData);
      if (!validationResult.isValid) {
        throw new Error(`Invalid NFT data: ${validationResult.reason}`);
      }

      // Process the pairing
      const pairingResult = await this.processPairing(token, nftData, userId, tokenDetails);

      // Mark token as used
      await this.markTokenAsUsed(token, userId);

      // Clear cache
      await this.cache.del(`pairing_token:${token}`);

      logger.info(`Successfully validated pairing for user ${userId} with token ${token}`);

      return {
        success: true,
        profileId: pairingResult.profileId,
        nftId: pairingResult.nftId,
        platform: tokenDetails.platform,
        pairedAt: new Date().toISOString(),
        message: 'NFT pairing completed successfully',
      };
    } catch (error) {
      logger.error(`Error validating pairing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate token from database
   * @param {string} token - The pairing token
   * @returns {Object|null} Token details or null if invalid
   */
  async validateTokenFromDatabase(token) {
    try {
      const query = `
        SELECT id, token, user_id, platform, expires_at, used_at, is_active
        FROM pairing_tokens
        WHERE token = $1 AND is_active = true
      `;

      const result = await this.db.query(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      const tokenData = result.rows[0];

      // Check if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        return null;
      }

      // Check if already used
      if (tokenData.used_at) {
        return null;
      }

      return {
        id: tokenData.id,
        token: tokenData.token,
        userId: tokenData.user_id,
        platform: tokenData.platform,
        expiresAt: tokenData.expires_at,
        usedAt: tokenData.used_at,
      };
    } catch (error) {
      logger.error(`Error validating token from database: ${error.message}`);
      return null;
    }
  }

  /**
   * Get token details from database
   * @param {string} token - The pairing token
   * @returns {Object|null} Token details
   */
  async getTokenDetails(token) {
    try {
      const query = `
        SELECT id, token, user_id, platform, expires_at, used_at
        FROM pairing_tokens
        WHERE token = $1
      `;

      const result = await this.db.query(query, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        id: result.rows[0].id,
        token: result.rows[0].token,
        userId: result.rows[0].user_id,
        platform: result.rows[0].platform,
        expiresAt: result.rows[0].expires_at,
        usedAt: result.rows[0].used_at,
      };
    } catch (error) {
      logger.error(`Error getting token details: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate NFT data structure
   * @param {Object} nftData - The NFT data to validate
   * @returns {Object} Validation result
   */
  async validateNFTData(nftData) {
    try {
      // Basic structure validation
      if (!nftData || typeof nftData !== 'object') {
        return { isValid: false, reason: 'NFT data must be an object' };
      }

      // Required fields validation
      const requiredFields = ['tokenId', 'contractAddress', 'chainId'];
      for (const field of requiredFields) {
        if (!nftData[field]) {
          return { isValid: false, reason: `Missing required field: ${field}` };
        }
      }

      // Token ID validation (should be a string or number)
      if (typeof nftData.tokenId !== 'string' && typeof nftData.tokenId !== 'number') {
        return { isValid: false, reason: 'Token ID must be a string or number' };
      }

      // Contract address validation (basic Ethereum address format)
      if (typeof nftData.contractAddress === 'string') {
        if (!/^0x[a-fA-F0-9]{40}$/.test(nftData.contractAddress)) {
          return { isValid: false, reason: 'Invalid contract address format' };
        }
      }

      // Chain ID validation
      if (typeof nftData.chainId !== 'number' || nftData.chainId <= 0) {
        return { isValid: false, reason: 'Chain ID must be a positive number' };
      }

      // Metadata validation (optional)
      if (nftData.metadata && typeof nftData.metadata !== 'object') {
        return { isValid: false, reason: 'Metadata must be an object' };
      }

      // Image URL validation (optional)
      if (nftData.imageUrl && typeof nftData.imageUrl !== 'string') {
        return { isValid: false, reason: 'Image URL must be a string' };
      }

      return { isValid: true, reason: 'NFT data is valid' };
    } catch (error) {
      logger.error(`Error validating NFT data: ${error.message}`);
      return { isValid: false, reason: 'Validation error occurred' };
    }
  }

  /**
   * Process the NFT pairing
   * @param {string} token - The pairing token
   * @param {Object} nftData - The NFT data
   * @param {string} userId - The user's device ID
   * @param {Object} tokenDetails - Token details
   * @returns {Object} Pairing result
   */
  async processPairing(token, nftData, userId, tokenDetails) {
    try {
      // Import NFT service for storing the NFT
      const { NFTService } = require('./nftService');
      const nftService = new NFTService();

      // Store the NFT in the user's collection
      const storedNFT = await nftService.storeNFT(
        userId,
        nftData,
        tokenDetails.platform,
        nftData.collectionName,
      );

      // Create or update user profile
      const profileId = await this.ensureUserProfile(userId);

      // Log the pairing event
      await this.logPairingEvent(token, nftData, userId, tokenDetails.platform);

      return {
        profileId,
        nftId: storedNFT.id,
        platform: tokenDetails.platform,
      };
    } catch (error) {
      logger.error(`Error processing pairing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ensure user profile exists
   * @param {string} userId - The user's device ID
   * @returns {string} Profile ID
   */
  async ensureUserProfile(userId) {
    try {
      const query = `
        INSERT INTO user_nft_profiles (user_id, nft_count)
        VALUES ($1, 0)
        ON CONFLICT (user_id) 
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const result = await this.db.query(query, [userId]);

      if (!result.rows[0]) {
        throw new Error('Failed to ensure user profile');
      }

      return result.rows[0].id;
    } catch (error) {
      logger.error(`Error ensuring user profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark token as used
   * @param {string} token - The pairing token
   * @param {string} userId - The user's device ID
   */
  async markTokenAsUsed(token, userId) {
    try {
      const query = `
        UPDATE pairing_tokens 
        SET used_at = CURRENT_TIMESTAMP, is_active = false
        WHERE token = $1
      `;

      await this.db.query(query, [token]);

      logger.info(`Marked token ${token} as used by user ${userId}`);
    } catch (error) {
      logger.error(`Error marking token as used: ${error.message}`);
    }
  }

  /**
   * Log pairing event for audit
   * @param {string} token - The pairing token
   * @param {Object} nftData - The NFT data
   * @param {string} userId - The user's device ID
   * @param {string} platform - The platform
   */
  async logPairingEvent(token, nftData, userId, platform) {
    try {
      const query = `
        INSERT INTO audit_logs (device_id, action, resource_type, resource_id, encrypted_details)
        VALUES ($1, $2, $3, $4, $5)
      `;

      const encryptedDetails = await this.encryption.encrypt(JSON.stringify({
        token,
        nftData,
        platform,
        pairedAt: new Date().toISOString(),
      }));

      await this.db.query(query, [
        userId,
        'nft_pairing_completed',
        'nft',
        nftData.tokenId,
        encryptedDetails,
      ]);

      logger.info(`Logged pairing event for user ${userId} with NFT ${nftData.tokenId}`);
    } catch (error) {
      logger.error(`Error logging pairing event: ${error.message}`);
    }
  }

  /**
   * Get pairing statistics
   * @param {string} userId - The user's device ID
   * @returns {Object} Pairing statistics
   */
  async getPairingStats(userId) {
    try {
      // Get successful pairings count
      const successQuery = `
        SELECT COUNT(*) as successful_pairings
        FROM audit_logs
        WHERE device_id = $1 AND action = 'nft_pairing_completed'
      `;

      const successResult = await this.db.query(successQuery, [userId]);

      // Get platform distribution
      const platformQuery = `
        SELECT platform, COUNT(*) as count
        FROM nft_collections
        WHERE user_id = $1 AND is_active = true
        GROUP BY platform
        ORDER BY count DESC
      `;

      const platformResult = await this.db.query(platformQuery, [userId]);

      // Get recent pairings
      const recentQuery = `
        SELECT al.created_at, al.resource_id, nc.platform
        FROM audit_logs al
        LEFT JOIN nft_collections nc ON al.resource_id = nc.id
        WHERE al.device_id = $1 AND al.action = 'nft_pairing_completed'
        ORDER BY al.created_at DESC
        LIMIT 10
      `;

      const recentResult = await this.db.query(recentQuery, [userId]);

      return {
        successfulPairings: parseInt(successResult.rows[0]?.successful_pairings || 0),
        platformDistribution: platformResult.rows.map(row => ({
          platform: row.platform,
          count: parseInt(row.count),
        })),
        recentPairings: recentResult.rows.map(row => ({
          pairedAt: row.created_at,
          nftId: row.resource_id,
          platform: row.platform,
        })),
      };
    } catch (error) {
      logger.error(`Error getting pairing stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up expired and used tokens
   */
  async cleanupTokens() {
    try {
      const query = `
        DELETE FROM pairing_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL
      `;

      const result = await this.db.query(query);

      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired/used pairing tokens`);
      }
    } catch (error) {
      logger.error(`Error cleaning up tokens: ${error.message}`);
    }
  }
}

module.exports = { PairingService };
