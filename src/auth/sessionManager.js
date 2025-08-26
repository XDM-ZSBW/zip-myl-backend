const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

class SessionManager {
  constructor() {
    this.maxSessionsPerDevice = parseInt(process.env.MAX_SESSIONS_PER_DEVICE) || 5;
    this.sessionCleanupInterval = parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 3600000; // 1 hour
    this.startCleanupTimer();
  }

  /**
   * Create a new session
   */
  async createSession(sessionData) {
    try {
      const {
        deviceId,
        accessToken,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        ipAddress,
        userAgent
      } = sessionData;

      // Hash tokens for storage
      const hashedAccessToken = crypto.createHash('sha256').update(accessToken).digest('hex');
      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Check session limit for device
      await this.enforceSessionLimit(deviceId);

      const session = await prisma.session.create({
        data: {
          deviceId,
          accessToken: hashedAccessToken,
          refreshToken: hashedRefreshToken,
          expiresAt,
          refreshExpiresAt,
          isActive: true,
          ipAddress,
          userAgent
        }
      });

      logger.info('Session created', { 
        sessionId: session.id, 
        deviceId: session.deviceId 
      });

      return session;
    } catch (error) {
      logger.error('Error creating session', { error: error.message });
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get active session by access token
   */
  async getSessionByAccessToken(accessToken) {
    try {
      const hashedToken = crypto.createHash('sha256').update(accessToken).digest('hex');
      
      const session = await prisma.session.findFirst({
        where: {
          accessToken: hashedToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: { device: true }
      });

      return session;
    } catch (error) {
      logger.error('Error getting session by access token', { error: error.message });
      return null;
    }
  }

  /**
   * Get active session by refresh token
   */
  async getSessionByRefreshToken(refreshToken) {
    try {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const session = await prisma.session.findFirst({
        where: {
          refreshToken: hashedToken,
          isActive: true,
          refreshExpiresAt: { gt: new Date() }
        },
        include: { device: true }
      });

      return session;
    } catch (error) {
      logger.error('Error getting session by refresh token', { error: error.message });
      return null;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId, updateData) {
    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: updateData
      });

      logger.info('Session updated', { sessionId: session.id });
      return session;
    } catch (error) {
      logger.error('Error updating session', { error: error.message });
      throw new Error('Failed to update session');
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(sessionId) {
    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      logger.info('Session revoked', { sessionId: session.id });
      return session;
    } catch (error) {
      logger.error('Error revoking session', { error: error.message });
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions for a device
   */
  async revokeAllDeviceSessions(deviceId) {
    try {
      const result = await prisma.session.updateMany({
        where: { deviceId, isActive: true },
        data: { isActive: false }
      });

      logger.info('All device sessions revoked', { 
        deviceId, 
        sessionsRevoked: result.count 
      });

      return result;
    } catch (error) {
      logger.error('Error revoking all device sessions', { error: error.message });
      throw new Error('Failed to revoke device sessions');
    }
  }

  /**
   * Get active sessions for a device
   */
  async getDeviceSessions(deviceId) {
    try {
      const sessions = await prisma.session.findMany({
        where: { 
          deviceId, 
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          refreshExpiresAt: true,
          ipAddress: true,
          userAgent: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return sessions;
    } catch (error) {
      logger.error('Error getting device sessions', { error: error.message });
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      
      const result = await prisma.session.updateMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { refreshExpiresAt: { lt: now } }
          ],
          isActive: true
        },
        data: { isActive: false }
      });

      if (result.count > 0) {
        logger.info('Expired sessions cleaned up', { 
          sessionsCleaned: result.count 
        });
      }

      return result;
    } catch (error) {
      logger.error('Error cleaning up expired sessions', { error: error.message });
      return { count: 0 };
    }
  }

  /**
   * Enforce session limit per device
   */
  async enforceSessionLimit(deviceId) {
    try {
      const activeSessions = await prisma.session.count({
        where: { 
          deviceId, 
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (activeSessions >= this.maxSessionsPerDevice) {
        // Revoke oldest sessions
        const oldestSessions = await prisma.session.findMany({
          where: { 
            deviceId, 
            isActive: true,
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: 'asc' },
          take: activeSessions - this.maxSessionsPerDevice + 1
        });

        for (const session of oldestSessions) {
          await this.revokeSession(session.id);
        }

        logger.info('Session limit enforced', { 
          deviceId, 
          sessionsRevoked: oldestSessions.length 
        });
      }
    } catch (error) {
      logger.error('Error enforcing session limit', { error: error.message });
      throw new Error('Failed to enforce session limit');
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      const now = new Date();
      
      const stats = await prisma.session.groupBy({
        by: ['isActive'],
        _count: {
          id: true
        },
        where: {
          OR: [
            { expiresAt: { gt: now } },
            { refreshExpiresAt: { gt: now } }
          ]
        }
      });

      const totalActive = stats.find(s => s.isActive)?._count?.id || 0;
      const totalInactive = stats.find(s => !s.isActive)?._count?.id || 0;

      return {
        active: totalActive,
        inactive: totalInactive,
        total: totalActive + totalInactive
      };
    } catch (error) {
      logger.error('Error getting session stats', { error: error.message });
      return { active: 0, inactive: 0, total: 0 };
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.sessionCleanupInterval);

    logger.info('Session cleanup timer started', { 
      interval: this.sessionCleanupInterval 
    });
  }

  /**
   * Validate session
   */
  async validateSession(sessionId) {
    try {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { device: true }
      });

      if (!session) {
        return { valid: false, error: 'Session not found' };
      }

      if (!session.isActive) {
        return { valid: false, error: 'Session is inactive' };
      }

      if (session.expiresAt < new Date()) {
        return { valid: false, error: 'Session expired' };
      }

      if (!session.device.isActive) {
        return { valid: false, error: 'Device is inactive' };
      }

      return { valid: true, session };
    } catch (error) {
      logger.error('Error validating session', { error: error.message });
      return { valid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Refresh session tokens
   */
  async refreshSessionTokens(sessionId, newAccessToken, newRefreshToken, newExpiresAt, newRefreshExpiresAt) {
    try {
      const hashedAccessToken = crypto.createHash('sha256').update(newAccessToken).digest('hex');
      const hashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

      const session = await prisma.session.update({
        where: { id: sessionId },
        data: {
          accessToken: hashedAccessToken,
          refreshToken: hashedRefreshToken,
          expiresAt: newExpiresAt,
          refreshExpiresAt: newRefreshExpiresAt
        }
      });

      logger.info('Session tokens refreshed', { sessionId: session.id });
      return session;
    } catch (error) {
      logger.error('Error refreshing session tokens', { error: error.message });
      throw new Error('Failed to refresh session tokens');
    }
  }
}

module.exports = new SessionManager();
