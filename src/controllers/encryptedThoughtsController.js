const { logger } = require('../utils/logger');
const trustService = require('../services/trustService');
const encryptionService = require('../services/encryptionService');

/**
 * Encrypted Thoughts Controller
 * Handles end-to-end encrypted thought data
 */
class EncryptedThoughtsController {
  constructor() {
    this.thoughts = new Map(); // In production, this would be a database
  }

  /**
   * Store encrypted thought data
   * Server cannot decrypt the data - it's stored as encrypted blobs
   */
  async storeEncryptedThought(req, res) {
    try {
      const { encryptedData, deviceId, metadata } = req.body;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to store thoughts',
        });
      }

      // Verify device has write permission
      if (!(await trustService.hasPermission(deviceId, 'canWrite'))) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'This device does not have write permissions',
        });
      }

      // Validate encrypted data structure
      if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag) {
        return res.status(400).json({
          error: 'Invalid encrypted data',
          message: 'Encrypted data must include encrypted, iv, and tag fields',
        });
      }

      // Generate unique thought ID
      const thoughtId = encryptionService.generateSessionToken();

      // Store encrypted thought (server cannot read the content)
      const thought = {
        id: thoughtId,
        deviceId,
        encryptedData: {
          encrypted: encryptedData.encrypted,
          iv: encryptedData.iv,
          tag: encryptedData.tag,
          algorithm: encryptedData.algorithm || 'aes-256-gcm',
        },
        metadata: {
          timestamp: new Date(),
          contentType: metadata?.contentType || 'unknown',
          domain: metadata?.domain || 'unknown',
          wordCount: metadata?.wordCount || 0,
          characterCount: metadata?.characterCount || 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.thoughts.set(thoughtId, thought);

      // Update device last seen
      await trustService.updateLastSeen(deviceId);

      logger.info(`Encrypted thought stored: ${thoughtId} from device: ${deviceId}`);

      res.status(201).json({
        success: true,
        thoughtId,
        message: 'Encrypted thought stored successfully',
      });
    } catch (error) {
      logger.error('Error storing encrypted thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to store encrypted thought',
      });
    }
  }

  /**
   * Retrieve encrypted thought data
   * Server returns encrypted data without decryption
   */
  async getEncryptedThought(req, res) {
    try {
      const { thoughtId } = req.params;
      const { deviceId } = req.query;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to retrieve thoughts',
        });
      }

      // Verify device has read permission
      if (!(await trustService.hasPermission(deviceId, 'canRead'))) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'This device does not have read permissions',
        });
      }

      const thought = this.thoughts.get(thoughtId);
      if (!thought) {
        return res.status(404).json({
          error: 'Thought not found',
          message: 'The requested thought does not exist',
        });
      }

      // Update device last seen
      await trustService.updateLastSeen(deviceId);

      // Return encrypted data (server cannot decrypt it)
      res.json({
        success: true,
        thought: {
          id: thought.id,
          encryptedData: thought.encryptedData,
          metadata: thought.metadata,
          createdAt: thought.createdAt,
          updatedAt: thought.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Error retrieving encrypted thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve encrypted thought',
      });
    }
  }

  /**
   * List encrypted thoughts for a device
   * Returns only metadata and encrypted data references
   */
  async listEncryptedThoughts(req, res) {
    try {
      const { deviceId } = req.query;
      const { limit = 50, offset = 0 } = req.query;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to list thoughts',
        });
      }

      // Verify device has read permission
      if (!(await trustService.hasPermission(deviceId, 'canRead'))) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'This device does not have read permissions',
        });
      }

      // Get thoughts for this device (in production, this would be a database query)
      const deviceThoughts = Array.from(this.thoughts.values())
        .filter(thought => thought.deviceId === deviceId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + parseInt(limit));

      // Update device last seen
      await trustService.updateLastSeen(deviceId);

      res.json({
        success: true,
        thoughts: deviceThoughts.map(thought => ({
          id: thought.id,
          metadata: thought.metadata,
          createdAt: thought.createdAt,
          updatedAt: thought.updatedAt,
        })),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: deviceThoughts.length,
        },
      });
    } catch (error) {
      logger.error('Error listing encrypted thoughts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list encrypted thoughts',
      });
    }
  }

  /**
   * Update encrypted thought
   * Server stores new encrypted data without reading content
   */
  async updateEncryptedThought(req, res) {
    try {
      const { thoughtId } = req.params;
      const { encryptedData, deviceId } = req.body;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to update thoughts',
        });
      }

      // Verify device has write permission
      if (!(await trustService.hasPermission(deviceId, 'canWrite'))) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'This device does not have write permissions',
        });
      }

      const thought = this.thoughts.get(thoughtId);
      if (!thought) {
        return res.status(404).json({
          error: 'Thought not found',
          message: 'The requested thought does not exist',
        });
      }

      // Verify the device owns this thought
      if (thought.deviceId !== deviceId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update your own thoughts',
        });
      }

      // Update encrypted data (server cannot read the content)
      thought.encryptedData = {
        encrypted: encryptedData.encrypted,
        iv: encryptedData.iv,
        tag: encryptedData.tag,
        algorithm: encryptedData.algorithm || 'aes-256-gcm',
      };
      thought.updatedAt = new Date();

      this.thoughts.set(thoughtId, thought);

      // Update device last seen
      await trustService.updateLastSeen(deviceId);

      logger.info(`Encrypted thought updated: ${thoughtId} by device: ${deviceId}`);

      res.json({
        success: true,
        message: 'Encrypted thought updated successfully',
      });
    } catch (error) {
      logger.error('Error updating encrypted thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update encrypted thought',
      });
    }
  }

  /**
   * Delete encrypted thought
   */
  async deleteEncryptedThought(req, res) {
    try {
      const { thoughtId } = req.params;
      const { deviceId } = req.query;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to delete thoughts',
        });
      }

      // Verify device has write permission
      if (!(await trustService.hasPermission(deviceId, 'canWrite'))) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'This device does not have write permissions',
        });
      }

      const thought = this.thoughts.get(thoughtId);
      if (!thought) {
        return res.status(404).json({
          error: 'Thought not found',
          message: 'The requested thought does not exist',
        });
      }

      // Verify the device owns this thought
      if (thought.deviceId !== deviceId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete your own thoughts',
        });
      }

      this.thoughts.delete(thoughtId);

      // Update device last seen
      await trustService.updateLastSeen(deviceId);

      logger.info(`Encrypted thought deleted: ${thoughtId} by device: ${deviceId}`);

      res.json({
        success: true,
        message: 'Encrypted thought deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting encrypted thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete encrypted thought',
      });
    }
  }
}

module.exports = new EncryptedThoughtsController();
