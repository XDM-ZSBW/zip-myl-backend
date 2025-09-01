const crypto = require('crypto');
const logger = require('../utils/logger');
const { nftDatabaseService } = require('./nftDatabaseService');
const { nftEncryptionService } = require('./nftEncryptionService');
const { nftCacheService } = require('./nftCacheService');

class NFTService {
  constructor() {
    this.db = nftDatabaseService;
    this.encryption = nftEncryptionService;
    this.cache = nftCacheService;
  }

  /**
   * Generate a pairing token for NFT validation
   * @param {string} userId - The user's device ID
   * @param {string} platform - The platform (e.g., 'ethereum', 'polygon')
   * @param {string} collectionName - Optional collection name
   * @returns {Object} Generated token data
   */
  async generatePairingToken(userId, platform, collectionName = null) {
    try {
      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      // Store token in database
      const query = `
        INSERT INTO pairing_tokens (token, user_id, platform, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, token, expires_at
      `;

      const result = await this.db.query(query, [token, userId, platform, expiresAt]);

      if (!result.rows[0]) {
        throw new Error('Failed to generate pairing token');
      }

      // Generate QR code data (simplified - in production, use a proper QR library)
      const qrCodeData = {
        token,
        platform,
        userId,
        expiresAt: expiresAt.toISOString(),
      };

      // Cache token for quick validation
      await this.cache.set(`pairing_token:${token}`, qrCodeData, 15 * 60); // 15 minutes

      logger.info(`Generated pairing token for user ${userId} on platform ${platform}`);

      return {
        token,
        expiresAt: expiresAt.toISOString(),
        qrCode: qrCodeData,
        tokenId: result.rows[0].id,
      };
    } catch (error) {
      logger.error(`Error generating pairing token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store NFT in user's collection
   * @param {string} userId - The user's device ID
   * @param {Object} nftData - The NFT data to store
   * @param {string} platform - The platform
   * @param {string} collectionName - Optional collection name
   * @returns {Object} Stored NFT data
   */
  async storeNFT(userId, nftData, platform, collectionName = null) {
    try {
      // Encrypt sensitive NFT data
      const encryptedData = await this.encryption.encrypt(JSON.stringify(nftData));

      // Store in database
      const query = `
        INSERT INTO nft_collections (user_id, nft_data, platform, collection_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `;

      const result = await this.db.query(query, [userId, encryptedData, platform, collectionName]);

      if (!result.rows[0]) {
        throw new Error('Failed to store NFT');
      }

      // Update user profile NFT count
      await this.updateUserNFTCount(userId);

      // Cache the NFT data
      const cacheKey = `nft:${userId}:${result.rows[0].id}`;
      await this.cache.set(cacheKey, { ...nftData, id: result.rows[0].id }, 3600); // 1 hour

      logger.info(`Stored NFT for user ${userId} on platform ${platform}`);

      return {
        id: result.rows[0].id,
        nftData,
        platform,
        collectionName,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      logger.error(`Error storing NFT: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's NFT profile collection
   * @param {string} userId - The user's device ID
   * @param {Object} options - Query options (page, limit, platform)
   * @returns {Object} Collection data with pagination
   */
  async getProfileCollection(userId, options = {}) {
    try {
      const { page = 1, limit = 20, platform } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT id, nft_data, platform, collection_name, created_at
        FROM nft_collections
        WHERE user_id = $1 AND is_active = true
      `;

      const queryParams = [userId];
      let paramIndex = 2;

      if (platform) {
        query += ` AND platform = $${paramIndex}`;
        queryParams.push(platform);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await this.db.query(query, queryParams);

      // Decrypt NFT data
      const decryptedNFTs = await Promise.all(
        result.rows.map(async(row) => {
          try {
            const decryptedData = await this.encryption.decrypt(row.nft_data);
            return {
              id: row.id,
              nftData: JSON.parse(decryptedData),
              platform: row.platform,
              collectionName: row.collection_name,
              createdAt: row.created_at,
            };
          } catch (error) {
            logger.warn(`Failed to decrypt NFT ${row.id}: ${error.message}`);
            return {
              id: row.id,
              nftData: null,
              platform: row.platform,
              collectionName: row.collection_name,
              createdAt: row.created_at,
              error: 'Decryption failed',
            };
          }
        }),
      );

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM nft_collections
        WHERE user_id = $1 AND is_active = true
      `;

      const countParams = [userId];
      if (platform) {
        countQuery += ' AND platform = $2';
        countParams.push(platform);
      }

      const countResult = await this.db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      return {
        nfts: decryptedNFTs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error(`Error retrieving profile collection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store invalid NFT with reason
   * @param {Object} nftData - The invalid NFT data
   * @param {string} reason - Reason for invalidity
   * @param {string} platform - The platform
   * @param {string} userId - Optional user ID
   * @returns {Object} Stored invalid NFT record
   */
  async storeInvalidNFT(nftData, reason, platform, userId = null) {
    try {
      // Encrypt NFT data before storing
      const encryptedData = await this.encryption.encrypt(JSON.stringify(nftData));

      const query = `
        INSERT INTO invalid_nfts (nft_data, reason, platform, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `;

      const result = await this.db.query(query, [encryptedData, reason, platform, userId]);

      if (!result.rows[0]) {
        throw new Error('Failed to store invalid NFT');
      }

      logger.info(`Stored invalid NFT on platform ${platform}, reason: ${reason}`);

      return {
        id: result.rows[0].id,
        reason,
        platform,
        userId,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      logger.error(`Error storing invalid NFT: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user's profile picture
   * @param {string} userId - The user's device ID
   * @param {string} imageData - Base64 encoded image data
   * @param {string} imageFormat - Image format (jpeg, png, gif)
   * @returns {Object} Updated profile data
   */
  async updateProfilePicture(userId, imageData, imageFormat = 'jpeg') {
    try {
      // Validate image format
      if (!['jpeg', 'png', 'gif'].includes(imageFormat)) {
        throw new Error('Invalid image format');
      }

      // Generate image hash for integrity
      const imageHash = crypto.createHash('sha256').update(imageData).digest('hex');

      // In production, upload to CDN and get URL
      // For now, we'll store the hash and assume CDN integration
      const imageUrl = `https://cdn.example.com/profiles/${userId}/${imageHash}.${imageFormat}`;

      // Check if user profile exists, create if not
      const query = `
        INSERT INTO user_nft_profiles (user_id, profile_picture_url, profile_picture_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          profile_picture_url = EXCLUDED.profile_picture_url,
          profile_picture_hash = EXCLUDED.profile_picture_hash,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, profile_picture_url, updated_at
      `;

      const result = await this.db.query(query, [userId, imageUrl, imageHash]);

      if (!result.rows[0]) {
        throw new Error('Failed to update profile picture');
      }

      // Cache the profile picture URL
      await this.cache.set(`profile_picture:${userId}`, imageUrl, 86400); // 24 hours

      logger.info(`Updated profile picture for user ${userId}`);

      return {
        id: result.rows[0].id,
        imageUrl: result.rows[0].profile_picture_url,
        imageHash,
        updatedAt: result.rows[0].updated_at,
      };
    } catch (error) {
      logger.error(`Error updating profile picture: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's NFT statistics
   * @param {string} userId - The user's device ID
   * @returns {Object} User NFT statistics
   */
  async getUserStats(userId) {
    try {
      // Get NFT collection count
      const collectionQuery = `
        SELECT COUNT(*) as total_nfts,
               COUNT(DISTINCT platform) as platforms,
               COUNT(DISTINCT collection_name) as collections
        FROM nft_collections
        WHERE user_id = $1 AND is_active = true
      `;

      const collectionResult = await this.db.query(collectionQuery, [userId]);

      // Get profile information
      const profileQuery = `
        SELECT profile_picture_url, nft_count, last_nft_added
        FROM user_nft_profiles
        WHERE user_id = $1
      `;

      const profileResult = await this.db.query(profileQuery, [userId]);

      // Get platform distribution
      const platformQuery = `
        SELECT platform, COUNT(*) as count
        FROM nft_collections
        WHERE user_id = $1 AND is_active = true
        GROUP BY platform
        ORDER BY count DESC
      `;

      const platformResult = await this.db.query(platformQuery, [userId]);

      const stats = {
        totalNFTs: parseInt(collectionResult.rows[0]?.total_nfts || 0, 10),
        platforms: parseInt(collectionResult.rows[0]?.platforms || 0, 10),
        collections: parseInt(collectionResult.rows[0]?.collections || 0, 10),
        platformDistribution: platformResult.rows.map(row => ({
          platform: row.platform,
          count: parseInt(row.count, 10),
        })),
        profile: profileResult.rows[0] ? {
          hasProfilePicture: !!profileResult.rows[0].profile_picture_url,
          nftCount: parseInt(profileResult.rows[0].nft_count || 0, 10),
          lastNFTAdded: profileResult.rows[0].last_nft_added,
        } : null,
      };

      // Cache stats for 5 minutes
      await this.cache.set(`user_stats:${userId}`, stats, 300);

      return stats;
    } catch (error) {
      logger.error(`Error getting user stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user's NFT count
   * @param {string} userId - The user's device ID
   */
  async updateUserNFTCount(userId) {
    try {
      const query = `
        UPDATE user_nft_profiles 
        SET nft_count = (
          SELECT COUNT(*) 
          FROM nft_collections 
          WHERE user_id = $1 AND is_active = true
        ),
        last_nft_added = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `;

      await this.db.query(query, [userId]);
    } catch (error) {
      logger.error(`Error updating user NFT count: ${error.message}`);
    }
  }

  /**
   * Clean up expired pairing tokens
   */
  async cleanupExpiredTokens() {
    try {
      const query = `
        DELETE FROM pairing_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP
      `;

      const result = await this.db.query(query);

      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired pairing tokens`);
      }
    } catch (error) {
      logger.error(`Error cleaning up expired tokens: ${error.message}`);
    }
  }
}

module.exports = { NFTService };
