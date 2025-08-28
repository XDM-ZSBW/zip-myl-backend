const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

class AdminController {
  /**
   * Create a new API key
   */
  async createApiKey(req, res) {
    try {
      const { clientId, permissions, rateLimit, expiresAt } = req.body;

      if (!clientId || !permissions || !Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: 'Client ID and permissions array are required'
        });
      }

      // Verify client exists
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Client not found',
          message: 'The specified client does not exist'
        });
      }

      // Generate API key
      const apiKey = `ak_${uuidv4().replace(/-/g, '')}`;
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Create API key record
      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          clientId,
          keyHash,
          permissions,
          rateLimit: rateLimit || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        },
        include: {
          client: true
        }
      });

      logger.info('API key created', {
        apiKeyId: apiKeyRecord.id,
        clientId: clientId,
        permissions,
        createdBy: req.apiKey?.id || req.deviceId
      });

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          id: apiKeyRecord.id,
          apiKey, // Only returned once
          clientId: apiKeyRecord.clientId,
          clientName: apiKeyRecord.client.name,
          clientType: apiKeyRecord.client.clientType,
          permissions: apiKeyRecord.permissions,
          rateLimit: apiKeyRecord.rateLimit,
          expiresAt: apiKeyRecord.expiresAt,
          createdAt: apiKeyRecord.createdAt
        }
      });
    } catch (error) {
      logger.error('Error creating API key', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
        message: error.message
      });
    }
  }

  /**
   * List API keys
   */
  async listApiKeys(req, res) {
    try {
      const { page = 1, limit = 20, clientId, isActive } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (clientId) where.clientId = clientId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [apiKeys, total] = await Promise.all([
        prisma.apiKey.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                clientType: true,
                isActive: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.apiKey.count({ where })
      ]);

      // Remove sensitive data
      const sanitizedApiKeys = apiKeys.map(key => ({
        id: key.id,
        clientId: key.clientId,
        client: key.client,
        permissions: key.permissions,
        rateLimit: key.rateLimit,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt
      }));

      res.json({
        success: true,
        message: 'API keys retrieved successfully',
        data: {
          apiKeys: sanitizedApiKeys,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error listing API keys', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list API keys',
        message: error.message
      });
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(req, res) {
    try {
      const { id } = req.params;
      const { permissions, rateLimit, isActive, expiresAt } = req.body;

      const apiKey = await prisma.apiKey.findUnique({
        where: { id },
        include: { client: true }
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
          message: 'The specified API key does not exist'
        });
      }

      const updateData = {};
      if (permissions !== undefined) updateData.permissions = permissions;
      if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

      const updatedApiKey = await prisma.apiKey.update({
        where: { id },
        data: updateData,
        include: { client: true }
      });

      logger.info('API key updated', {
        apiKeyId: id,
        updatedBy: req.apiKey?.id || req.deviceId,
        changes: updateData
      });

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: {
          id: updatedApiKey.id,
          clientId: updatedApiKey.clientId,
          client: updatedApiKey.client,
          permissions: updatedApiKey.permissions,
          rateLimit: updatedApiKey.rateLimit,
          isActive: updatedApiKey.isActive,
          expiresAt: updatedApiKey.expiresAt,
          updatedAt: updatedApiKey.updatedAt
        }
      });
    } catch (error) {
      logger.error('Error updating API key', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
        message: error.message
      });
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(req, res) {
    try {
      const { id } = req.params;

      const apiKey = await prisma.apiKey.findUnique({
        where: { id }
      });

      if (!apiKey) {
        return res.status(404).json({
          success: false,
          error: 'API key not found',
          message: 'The specified API key does not exist'
        });
      }

      await prisma.apiKey.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info('API key revoked', {
        apiKeyId: id,
        revokedBy: req.apiKey?.id || req.deviceId
      });

      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error) {
      logger.error('Error revoking API key', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
        message: error.message
      });
    }
  }

  /**
   * Create a new client
   */
  async createClient(req, res) {
    try {
      const { name, clientType } = req.body;

      if (!name || !clientType) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input',
          message: 'Name and client type are required'
        });
      }

      const validClientTypes = ['web', 'mobile', 'desktop', 'service'];
      if (!validClientTypes.includes(clientType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid client type',
          message: `Client type must be one of: ${validClientTypes.join(', ')}`
        });
      }

      const client = await prisma.client.create({
        data: {
          name,
          clientType
        }
      });

      logger.info('Client created', {
        clientId: client.id,
        name: client.name,
        clientType: client.clientType,
        createdBy: req.apiKey?.id || req.deviceId
      });

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: client
      });
    } catch (error) {
      logger.error('Error creating client', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to create client',
        message: error.message
      });
    }
  }

  /**
   * List clients
   */
  async listClients(req, res) {
    try {
      const { page = 1, limit = 20, clientType, isActive } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (clientType) where.clientType = clientType;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          include: {
            _count: {
              select: {
                apiKeys: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.client.count({ where })
      ]);

      const clientsWithApiKeyCount = clients.map(client => ({
        ...client,
        apiKeyCount: client._count.apiKeys
      }));

      res.json({
        success: true,
        message: 'Clients retrieved successfully',
        data: {
          clients: clientsWithApiKeyCount,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error listing clients', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to list clients',
        message: error.message
      });
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(req, res) {
    try {
      const [
        deviceCount,
        activeDeviceCount,
        sessionCount,
        activeSessionCount,
        clientCount,
        activeClientCount,
        apiKeyCount,
        activeApiKeyCount
      ] = await Promise.all([
        prisma.device.count(),
        prisma.device.count({ where: { isActive: true } }),
        prisma.session.count(),
        prisma.session.count({ where: { isActive: true } }),
        prisma.client.count(),
        prisma.client.count({ where: { isActive: true } }),
        prisma.apiKey.count(),
        prisma.apiKey.count({ where: { isActive: true } })
      ]);

      res.json({
        success: true,
        message: 'System statistics retrieved successfully',
        data: {
          devices: {
            total: deviceCount,
            active: activeDeviceCount,
            inactive: deviceCount - activeDeviceCount
          },
          sessions: {
            total: sessionCount,
            active: activeSessionCount,
            inactive: sessionCount - activeSessionCount
          },
          clients: {
            total: clientCount,
            active: activeClientCount,
            inactive: clientCount - activeClientCount
          },
          apiKeys: {
            total: apiKeyCount,
            active: activeApiKeyCount,
            inactive: apiKeyCount - activeApiKeyCount
          }
        }
      });
    } catch (error) {
      logger.error('Error getting system stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get system statistics',
        message: error.message
      });
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        action, 
        success, 
        deviceId, 
        apiKeyId,
        startDate,
        endDate
      } = req.query;
      
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (action) where.action = action;
      if (success !== undefined) where.success = success === 'true';
      if (deviceId) where.deviceId = deviceId;
      if (apiKeyId) where.apiKeyId = apiKeyId;
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            device: {
              select: {
                id: true,
                fingerprint: true,
                ipAddress: true
              }
            },
            apiKey: {
              select: {
                id: true,
                client: {
                  select: {
                    id: true,
                    name: true,
                    clientType: true
                  }
                }
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.auditLog.count({ where })
      ]);

      res.json({
        success: true,
        message: 'Audit logs retrieved successfully',
        data: {
          auditLogs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error getting audit logs', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs',
        message: error.message
      });
    }
  }
}

module.exports = new AdminController();
