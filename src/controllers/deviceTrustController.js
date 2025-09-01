const logger = require('../utils/logger');
const trustService = require('../services/trustService');
const encryptionService = require('../services/encryptionService'); // eslint-disable-line no-unused-vars

/**
 * Device Trust Controller
 * Manages device registration, trust, and cross-device sharing
 */
class DeviceTrustController {
  constructor() {
    this.users = new Map(); // In production, this would be a database
  }

  /**
   * Register a new device
   */
  async registerDevice(req, res) {
    try {
      const { userId, deviceInfo } = req.body;

      if (!userId || !deviceInfo) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId and deviceInfo are required',
        });
      }

      const result = await trustService.registerDevice(userId, deviceInfo);

      res.status(201).json({
        success: true,
        deviceId: result.deviceId,
        requiresTrust: result.requiresTrust,
        message: 'Device registered successfully. Trust required before use.',
      });
    } catch (error) {
      logger.error('Error registering device:', error);

      // Provide more specific error messages
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          details: error.details,
        });
      }

      if (error.name === 'DatabaseError' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Database unavailable',
          message: 'Database connection failed',
          retryAfter: 30,
        });
      }

      if (error.name === 'DuplicateDeviceError') {
        return res.status(409).json({
          error: 'Device already exists',
          message: 'A device with this ID is already registered',
        });
      }

      res.status(500).json({
        error: 'Device registration failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * Trust a device
   */
  async trustDevice(req, res) {
    try {
      const { deviceId, trustedByDeviceId, permissions } = req.body;

      if (!deviceId || !trustedByDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId and trustedByDeviceId are required',
        });
      }

      const result = await trustService.trustDevice(deviceId, trustedByDeviceId, permissions);

      res.json({
        success: true,
        device: result.device,
        message: 'Device trusted successfully',
      });
    } catch (error) {
      logger.error('Error trusting device:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to trust device',
      });
    }
  }

  /**
   * Revoke trust from a device
   */
  async revokeTrust(req, res) {
    try {
      const { deviceId, revokedByDeviceId } = req.body;

      if (!deviceId || !revokedByDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId and revokedByDeviceId are required',
        });
      }

      const _result = await trustService.revokeTrust(deviceId, revokedByDeviceId);

      res.json({
        success: true,
        message: 'Device trust revoked successfully',
      });
    } catch (error) {
      logger.error('Error revoking trust:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to revoke trust',
      });
    }
  }

  /**
   * Get trusted devices for a user
   */
  async getTrustedDevices(req, res) {
    try {
      const { userId } = req.params;
      const { deviceId } = req.query;

      // Verify requesting device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted',
        });
      }

      const devices = await trustService.getTrustedDevices(userId);

      res.json({
        success: true,
        devices,
        message: 'Trusted devices retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting trusted devices:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get trusted devices',
      });
    }
  }

  /**
   * Generate a pairing code for device trust
   */
  async generatePairingCode(req, res) {
    try {
      const { deviceId, format = 'uuid', expiresInMinutes = 10 } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'deviceId is required',
        });
      }

      // Validate format parameter
      if (format && !['uuid', 'short', 'legacy'].includes(format.toLowerCase())) {
        return res.status(400).json({
          error: 'Invalid format parameter',
          message: 'Format must be "uuid", "short", or "legacy"',
        });
      }

      // Verify device is trusted (auto-trusted for same user)
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted to generate pairing codes',
        });
      }

      const result = await trustService.generatePairingCode(deviceId, expiresInMinutes, format.toLowerCase());

      res.json({
        success: true,
        pairingCode: result.pairingCode,
        format: result.format,
        expiresAt: result.expiresAt,
        message: 'Pairing code generated successfully',
      });
    } catch (error) {
      logger.error('Error generating pairing code:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate pairing code',
      });
    }
  }

  /**
   * Verify a pairing code
   */
  async verifyPairingCode(req, res) {
    try {
      const { pairingCode, requestingDeviceId } = req.body;

      if (!pairingCode || !requestingDeviceId) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'pairingCode and requestingDeviceId are required',
        });
      }

      const result = await trustService.verifyPairingCode(pairingCode, requestingDeviceId);

      res.json({
        success: true,
        pairedDeviceId: result.pairedDeviceId,
        requestingDeviceId: result.requestingDeviceId,
        message: 'Pairing code verified successfully',
      });
    } catch (error) {
      logger.error('Error verifying pairing code:', error);
      res.status(400).json({
        error: 'Invalid pairing code',
        message: error.message,
      });
    }
  }

  /**
   * Share a thought with trusted devices
   */
  async shareThought(req, res) {
    try {
      const { thoughtId, fromDeviceId, targetDeviceIds, permissions } = req.body;

      if (!thoughtId || !fromDeviceId || !targetDeviceIds || !Array.isArray(targetDeviceIds)) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'thoughtId, fromDeviceId, and targetDeviceIds array are required',
        });
      }

      const result = await trustService.shareThoughtWithDevices(
        thoughtId,
        fromDeviceId,
        targetDeviceIds,
        permissions,
      );

      res.json({
        success: true,
        sharingRecord: result,
        message: 'Thought shared successfully with trusted devices',
      });
    } catch (error) {
      logger.error('Error sharing thought:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to share thought',
      });
    }
  }

  /**
   * Get shared thoughts for a device
   */
  async getSharedThoughts(req, res) {
    try {
      const { deviceId } = req.params;

      // Verify device is trusted
      if (!(await trustService.isDeviceTrusted(deviceId))) {
        return res.status(403).json({
          error: 'Device not trusted',
          message: 'This device is not trusted',
        });
      }

      const sharedThoughts = await trustService.getSharedThoughts(deviceId);

      res.json({
        success: true,
        sharedThoughts,
        message: 'Shared thoughts retrieved successfully',
      });
    } catch (error) {
      logger.error('Error getting shared thoughts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get shared thoughts',
      });
    }
  }

  /**
   * Check device trust status
   */
  async checkDeviceTrust(req, res) {
    try {
      const { deviceId } = req.params;

      const isTrusted = await trustService.isDeviceTrusted(deviceId);
      const permissions = isTrusted ? {
        canRead: await trustService.hasPermission(deviceId, 'canRead'),
        canWrite: await trustService.hasPermission(deviceId, 'canWrite'),
        canShare: await trustService.hasPermission(deviceId, 'canShare'),
      } : null;

      res.json({
        success: true,
        deviceId,
        isTrusted,
        permissions,
        message: isTrusted ? 'Device is trusted' : 'Device is not trusted',
      });
    } catch (error) {
      logger.error('Error checking device trust:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check device trust',
      });
    }
  }

  /**
   * Get user-friendly status message
   */
  getStatusMessage(status) {
    const messages = {
      'queued': 'Your pairing code is in the queue and will be generated shortly',
      'generating': 'Generating your unique pairing code and NFT...',
      'validating': 'Validating the generated code and signature...',
      'completed': 'Pairing code generated successfully!',
      'failed': 'Generation failed. Please try again or use an alternative format',
    };

    return messages[status] || 'Processing your request...';
  }

  /**
   * Retry failed pairing code generation
   */
  async retryPairingCodeGeneration(req, res) {
    try {
      const { pairingCode } = req.params;
      const { deviceId } = req.body;

      if (!pairingCode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAIRING_CODE',
            message: 'Pairing code parameter is required',
            userAction: 'Please provide a valid pairing code',
          },
        });
      }

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_DEVICE_ID',
            message: 'Device ID is required for retry',
            userAction: 'Please provide your device ID',
          },
        });
      }

      // Attempt retry through trust service
      const _result = await trustService.retryPairingCodeGeneration(pairingCode, deviceId);

      res.json({
        success: true,
        message: 'Retry initiated successfully',
        pairingCode,
        status: 'queued',
        progress: 0,
        currentStep: 'initializing',
        estimatedTime: 45, // Estimated time for retry
        canRetry: false, // Disable retry until this attempt completes
        retryAfter: 60, // Allow retry after 1 minute if this fails
        nextSteps: [
          'Monitor progress via status endpoint',
          'Generation will restart automatically',
          'Check status for real-time updates',
        ],
      });
    } catch (error) {
      logger.error('Error retrying pairing code generation:', error);

      // Enhanced error response with specific guidance
      let errorCode = 'RETRY_FAILED';
      let userAction = 'Please try again later or contact support';
      let retryAfter = 60;

      if (error.message.includes('not found')) {
        errorCode = 'PAIRING_CODE_NOT_FOUND';
        userAction = 'Please generate a new pairing code';
        retryAfter = 0;
      } else if (error.message.includes('failed')) {
        errorCode = 'CANNOT_RETRY';
        userAction = 'This generation cannot be retried';
        retryAfter = 0;
      } else if (error.message.includes('exceeded')) {
        errorCode = 'MAX_RETRIES_EXCEEDED';
        userAction = 'Maximum retry attempts reached. Please generate a new code';
        retryAfter = 300; // 5 minutes
      }

      res.status(400).json({
        success: false,
        error: {
          code: errorCode,
          message: error.message,
          userAction,
          retryAfter,
          alternativeFormats: ['uuid', 'short'],
          estimatedRetryTime: retryAfter > 0 ? `${Math.ceil(retryAfter / 60)} minutes` : 'immediate',
        },
      });
    }
  }

  /**
   * Get pairing code status with enhanced information
   */
  async getPairingCodeStatus(req, res) {
    try {
      const { pairingCode } = req.params;
      const { deviceId } = req.query;

      if (!pairingCode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAIRING_CODE',
            message: 'Pairing code parameter is required',
            userAction: 'Please provide a valid pairing code',
          },
        });
      }

      // Get status from trust service
      const status = await trustService.getPairingCodeStatus(pairingCode, deviceId);

      if (!status) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PAIRING_CODE_NOT_FOUND',
            message: 'Pairing code not found or expired',
            userAction: 'Please generate a new pairing code',
          },
        });
      }

      // Calculate enhanced status information
      const progress = this.calculateProgress(status);
      const estimatedTime = this.estimateCompletionTime(status);
      const canRetry = this.canRetryGeneration(status);
      const retryAfter = this.getRetryAfterTime(status);

      res.json({
        success: true,
        pending: status.status !== 'completed' && status.status !== 'failed',
        status: status.status,
        progress,
        currentStep: status.currentStep || 'initializing',
        message: status.message || this.getStatusMessage(status.status),
        estimatedTime,
        canRetry,
        retryAfter,
        queuePosition: status.queuePosition || null,
        errorDetails: status.errorDetails || null,
        generationStartedAt: status.createdAt,
        lastActivityAt: status.lastActivityAt || status.updatedAt,
        pairingCode,
        format: status.format || 'uuid',
        expiresAt: status.expiresAt,
        deviceId: status.deviceId,
        nftStatus: status.nftStatus || null,
      });
    } catch (error) {
      logger.error('Error getting pairing code status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve pairing code status',
          userAction: 'Please try again or contact support',
        },
      });
    }
  }

  /**
   * Calculate progress percentage based on status
   */
  calculateProgress(status) {
    if (!status || !status.createdAt) return 0;

    const now = new Date();
    const startTime = new Date(status.createdAt);
    const elapsed = now - startTime;

    // Estimate total time based on status
    const estimatedTotalTime = this.estimateTotalTime(status.status);

    if (estimatedTotalTime <= 0) return 100;

    const progress = Math.min(Math.round((elapsed / estimatedTotalTime) * 100), 100);
    return Math.max(progress, 0);
  }

  /**
   * Estimate completion time in seconds
   */
  estimateCompletionTime(status) {
    if (!status || !status.createdAt) return null;

    const now = new Date();
    const startTime = new Date(status.createdAt);
    const elapsed = now - startTime;

    const estimatedTotalTime = this.estimateTotalTime(status.status);
    if (estimatedTotalTime <= 0) return 0;

    const remaining = estimatedTotalTime - elapsed;
    return Math.max(Math.round(remaining / 1000), 0);
  }

  /**
   * Estimate total time for generation based on status
   */
  estimateTotalTime(status) {
    const timeEstimates = {
      'queued': 30000,      // 30 seconds
      'generating': 45000,  // 45 seconds
      'validating': 15000,  // 15 seconds
      'completed': 0,       // Already done
      'failed': 0,          // Failed
    };

    return timeEstimates[status] || 60000; // Default 60 seconds
  }

  /**
   * Check if generation can be retried
   */
  canRetryGeneration(status) {
    if (!status) return false;

    // Can retry if failed and retry count is below limit
    if (status.status === 'failed') {
      const retryCount = status.retryCount || 0;
      const maxRetries = status.maxRetries || 3;
      return retryCount < maxRetries;
    }

    return false;
  }

  /**
   * Get retry after time in seconds
   */
  getRetryAfterTime(status) {
    if (!status) return 0;

    if (status.status === 'failed') {
      const retryCount = status.retryCount || 0;
      // Exponential backoff: 30s, 60s, 120s
      return Math.min(30 * Math.pow(2, retryCount), 300);
    }

    return 0;
  }

  /**
   * Stream real-time pairing code status updates via Server-Sent Events
   */
  async streamPairingCodeStatus(req, res) {
    try {
      const { pairingCode } = req.params;
      const { deviceId } = req.query;

      if (!pairingCode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PAIRING_CODE',
            message: 'Pairing code parameter is required',
            userAction: 'Please provide a valid pairing code',
          },
        });
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'SSE connection established',
        timestamp: new Date().toISOString(),
      })}\n\n`);

      // Set up status monitoring
      const statusInterval = setInterval(async() => {
        try {
          const status = await trustService.getPairingCodeStatus(pairingCode, deviceId);

          if (!status) {
            // Pairing code not found or expired
            res.write(`data: ${JSON.stringify({
              type: 'error',
              error: {
                code: 'PAIRING_CODE_NOT_FOUND',
                message: 'Pairing code not found or expired',
                userAction: 'Please generate a new pairing code',
              },
              timestamp: new Date().toISOString(),
            })}\n\n`);

            clearInterval(statusInterval);
            res.end();
            return;
          }

          // Calculate enhanced status information
          const progress = this.calculateProgress(status);
          const estimatedTime = this.estimateCompletionTime(status);
          const canRetry = this.canRetryGeneration(status);
          const retryAfter = this.getRetryAfterTime(status);

          // Send status update
          res.write(`data: ${JSON.stringify({
            type: 'status_update',
            pending: status.status !== 'completed' && status.status !== 'failed',
            status: status.status,
            progress,
            currentStep: status.currentStep || 'initializing',
            message: status.message || this.getStatusMessage(status.status),
            estimatedTime,
            canRetry,
            retryAfter,
            queuePosition: status.queuePosition || null,
            errorDetails: status.errorDetails || null,
            generationStartedAt: status.createdAt,
            lastActivityAt: status.lastActivityAt || status.updatedAt,
            pairingCode,
            format: status.format || 'uuid',
            expiresAt: status.expiresAt,
            deviceId: status.deviceId,
            nftStatus: status.nftStatus || null,
            timestamp: new Date().toISOString(),
          })}\n\n`);

          // Close connection if completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(statusInterval);
            res.end();
          }
        } catch (error) {
          logger.error('Error in SSE status stream:', error);

          res.write(`data: ${JSON.stringify({
            type: 'error',
            error: {
              code: 'STREAM_ERROR',
              message: 'Error retrieving status',
              userAction: 'Please refresh the page or try again',
            },
            timestamp: new Date().toISOString(),
          })}\n\n`);

          clearInterval(statusInterval);
          res.end();
        }
      }, 1000); // Update every second

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(statusInterval);
        logger.info(`SSE connection closed for pairing code: ${pairingCode}`);
      });

      // Handle errors
      req.on('error', (error) => {
        logger.error('SSE connection error:', error);
        clearInterval(statusInterval);
        res.end();
      });
    } catch (error) {
      logger.error('Error setting up SSE stream:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: {
            code: 'SSE_SETUP_FAILED',
            message: 'Failed to set up real-time status stream',
            userAction: 'Please use the regular status endpoint instead',
          },
        });
      } else {
        res.end();
      }
    }
  }
}

module.exports = new DeviceTrustController();
