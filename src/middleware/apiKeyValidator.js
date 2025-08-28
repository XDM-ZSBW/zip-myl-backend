const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

class APIKeyValidator {
  constructor() {
    this.apiKeyHeader = 'x-api-key';
    this.internalApiKey = process.env.INTERNAL_API_KEY;
  }

  /**
   * Validate API key from request headers
   */
  async validateApiKey(req, res, next) {
    try {
      const apiKey = req.headers[this.apiKeyHeader];
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'API key is required for this endpoint'
        });
      }

      // Check if it's an internal API key
      if (apiKey === this.internalApiKey) {
        req.apiKeyType = 'internal';
        req.apiKeyRole = 'service';
        return next();
      }

      // Validate API key in database
      const hashedApiKey = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const apiKeyRecord = await prisma.apiKey.findFirst({
        where: {
          keyHash: hashedApiKey,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: {
          client: true
        }
      });

      if (!apiKeyRecord) {
        logger.warn('Invalid API key used', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });

        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is invalid or expired'
        });
      }

      // Check if client is active
      if (!apiKeyRecord.client.isActive) {
        logger.warn('API key used for inactive client', {
          clientId: apiKeyRecord.client.id,
          apiKeyId: apiKeyRecord.id,
          ip: req.ip
        });

        return res.status(401).json({
          error: 'Client inactive',
          message: 'The client associated with this API key is inactive'
        });
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() }
      });

      // Attach API key info to request
      req.apiKey = {
        id: apiKeyRecord.id,
        keyHash: apiKeyRecord.keyHash,
        clientId: apiKeyRecord.clientId,
        clientType: apiKeyRecord.client.clientType,
        permissions: apiKeyRecord.permissions,
        rateLimit: apiKeyRecord.rateLimit,
        expiresAt: apiKeyRecord.expiresAt
      };

      req.apiKeyType = 'client';
      req.apiKeyRole = apiKeyRecord.client.clientType;

      logger.info('API key validated successfully', {
        apiKeyId: apiKeyRecord.id,
        clientId: apiKeyRecord.clientId,
        clientType: apiKeyRecord.client.clientType,
        ip: req.ip,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error validating API key', { error: error.message });
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate API key'
      });
    }
  }

  /**
   * Check if API key has required permissions
   */
  requirePermissions(requiredPermissions) {
    return (req, res, next) => {
      if (!req.apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'API key is required for this endpoint'
        });
      }

      const hasPermissions = requiredPermissions.every(permission => 
        req.apiKey.permissions.includes(permission)
      );

      if (!hasPermissions) {
        logger.warn('Insufficient permissions', {
          apiKeyId: req.apiKey.id,
          clientId: req.apiKey.clientId,
          requiredPermissions,
          actualPermissions: req.apiKey.permissions,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'API key does not have required permissions',
          required: requiredPermissions
        });
      }

      next();
    };
  }

  /**
   * Check if API key has required client type
   */
  requireClientType(requiredClientType) {
    return (req, res, next) => {
      if (!req.apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'API key is required for this endpoint'
        });
      }

      if (req.apiKey.clientType !== requiredClientType) {
        logger.warn('Invalid client type', {
          apiKeyId: req.apiKey.id,
          clientId: req.apiKey.clientId,
          requiredClientType,
          actualClientType: req.apiKey.clientType,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({
          error: 'Invalid client type',
          message: `This endpoint requires client type: ${requiredClientType}`
        });
      }

      next();
    };
  }

  /**
   * Check if API key has required role
   */
  requireRole(requiredRole) {
    return (req, res, next) => {
      if (!req.apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'API key is required for this endpoint'
        });
      }

      if (req.apiKeyRole !== requiredRole) {
        logger.warn('Invalid API key role', {
          apiKeyId: req.apiKey.id,
          clientId: req.apiKey.clientId,
          requiredRole,
          actualRole: req.apiKeyRole,
          ip: req.ip,
          path: req.path
        });

        return res.status(403).json({
          error: 'Invalid role',
          message: `This endpoint requires role: ${requiredRole}`
        });
      }

      next();
    };
  }

  /**
   * Optional API key validation (doesn't fail if no key provided)
   */
  async validateOptionalApiKey(req, res, next) {
    try {
      const apiKey = req.headers[this.apiKeyHeader];
      
      if (!apiKey) {
        req.apiKey = null;
        req.apiKeyType = null;
        req.apiKeyRole = null;
        return next();
      }

      // Use the same validation logic as required API key
      return this.validateApiKey(req, res, next);
    } catch (error) {
      logger.error('Error validating optional API key', { error: error.message });
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate API key'
      });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyStats(apiKeyId) {
    try {
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        include: {
          client: true,
          _count: {
            select: {
              auditLogs: true
            }
          }
        }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      return {
        id: apiKey.id,
        clientId: apiKey.clientId,
        clientType: apiKey.client.clientType,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        usageCount: apiKey._count.auditLogs
      };
    } catch (error) {
      logger.error('Error getting API key stats', { error: error.message });
      throw new Error('Failed to get API key statistics');
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId) {
    try {
      const apiKey = await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: { isActive: false }
      });

      logger.info('API key revoked', { apiKeyId: apiKey.id });
      return apiKey;
    } catch (error) {
      logger.error('Error revoking API key', { error: error.message });
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Check API key rate limit
   */
  async checkApiKeyRateLimit(req, res, next) {
    try {
      if (!req.apiKey || req.apiKeyType === 'internal') {
        return next();
      }

      const rateLimit = req.apiKey.rateLimit;
      if (!rateLimit) {
        return next();
      }

      // This would integrate with your rate limiting system
      // For now, we'll just log the rate limit info
      logger.info('API key rate limit check', {
        apiKeyId: req.apiKey.id,
        rateLimit: rateLimit,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.error('Error checking API key rate limit', { error: error.message });
      next(); // Continue even if rate limit check fails
    }
  }
}

module.exports = new APIKeyValidator();
