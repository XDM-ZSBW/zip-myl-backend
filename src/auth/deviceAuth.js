const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

class DeviceAuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate device fingerprint from request headers and IP
   */
  generateDeviceFingerprint(req) {
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const connection = req.get('Connection') || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    
    const fingerprintData = `${userAgent}-${acceptLanguage}-${acceptEncoding}-${connection}-${ip}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
  }

  /**
   * Register a new anonymous device
   */
  async registerDevice(req) {
    try {
      const deviceId = uuidv4();
      const deviceFingerprint = this.generateDeviceFingerprint(req);
      const ip = req.ip || req.connection.remoteAddress || '';

      // Check if device already exists
      const existingDevice = await prisma.device.findFirst({
        where: {
          OR: [
            { fingerprint: deviceFingerprint },
            { ipAddress: ip }
          ]
        }
      });

      if (existingDevice) {
        logger.info('Device already exists, returning existing device', { deviceId: existingDevice.id });
        return await this.generateTokens(existingDevice.id, req);
      }

      // Create new device
      const device = await prisma.device.create({
        data: {
          id: deviceId,
          fingerprint: deviceFingerprint,
          ipAddress: ip,
          userAgent: req.get('User-Agent') || '',
          isActive: true,
          lastSeen: new Date()
        }
      });

      logger.info('New device registered', { deviceId: device.id });
      return await this.generateTokens(device.id, req);
    } catch (error) {
      logger.error('Error registering device', { error: error.message });
      throw new Error('Failed to register device');
    }
  }

  /**
   * Generate JWT tokens for device
   */
  async generateTokens(deviceId, req) {
    try {
      const payload = {
        deviceId,
        type: 'device',
        iat: Math.floor(Date.now() / 1000)
      };

      const accessToken = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiresIn
      });

      const refreshToken = jwt.sign(
        { deviceId, type: 'refresh' },
        this.jwtRefreshSecret,
        { expiresIn: this.jwtRefreshExpiresIn }
      );

      // Store session in database
      const session = await prisma.session.create({
        data: {
          deviceId,
          accessToken: crypto.createHash('sha256').update(accessToken).digest('hex'),
          refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true,
          ipAddress: req.ip || req.connection.remoteAddress || '',
          userAgent: req.get('User-Agent') || ''
        }
      });

      // Update device last seen
      await prisma.device.update({
        where: { id: deviceId },
        data: { lastSeen: new Date() }
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes in seconds
        refreshExpiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
        deviceId
      };
    } catch (error) {
      logger.error('Error generating tokens', { error: error.message });
      throw new Error('Failed to generate tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken, req) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
      
      const session = await prisma.session.findFirst({
        where: {
          refreshToken: hashedRefreshToken,
          isActive: true,
          refreshExpiresAt: { gt: new Date() }
        },
        include: { device: true }
      });

      if (!session || !session.device.isActive) {
        throw new Error('Invalid or expired refresh token');
      }

      // Revoke old session
      await prisma.session.update({
        where: { id: session.id },
        data: { isActive: false }
      });

      // Generate new tokens
      return await this.generateTokens(session.deviceId, req);
    } catch (error) {
      logger.error('Error refreshing token', { error: error.message });
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Validate access token
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      if (decoded.type !== 'device') {
        throw new Error('Invalid token type');
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      
      const session = await prisma.session.findFirst({
        where: {
          accessToken: hashedToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        include: { device: true }
      });

      if (!session || !session.device.isActive) {
        throw new Error('Invalid or expired token');
      }

      return {
        deviceId: decoded.deviceId,
        sessionId: session.id,
        isValid: true
      };
    } catch (error) {
      logger.error('Error validating token', { error: error.message });
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Logout device (revoke all sessions)
   */
  async logout(deviceId) {
    try {
      await prisma.session.updateMany({
        where: { deviceId, isActive: true },
        data: { isActive: false }
      });

      logger.info('Device logged out', { deviceId });
      return { success: true };
    } catch (error) {
      logger.error('Error logging out device', { error: error.message });
      throw new Error('Failed to logout device');
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(deviceId) {
    try {
      const device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          sessions: {
            where: { isActive: true },
            select: {
              id: true,
              createdAt: true,
              expiresAt: true,
              ipAddress: true,
              userAgent: true
            }
          }
        }
      });

      if (!device) {
        throw new Error('Device not found');
      }

      return {
        id: device.id,
        fingerprint: device.fingerprint,
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
        isActive: device.isActive,
        createdAt: device.createdAt,
        lastSeen: device.lastSeen,
        activeSessions: device.sessions.length
      };
    } catch (error) {
      logger.error('Error getting device info', { error: error.message });
      throw new Error('Failed to get device info');
    }
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId, updateData) {
    try {
      const device = await prisma.device.update({
        where: { id: deviceId },
        data: {
          ...updateData,
          lastSeen: new Date()
        }
      });

      logger.info('Device updated', { deviceId: device.id });
      return device;
    } catch (error) {
      logger.error('Error updating device', { error: error.message });
      throw new Error('Failed to update device');
    }
  }

  /**
   * Revoke device access
   */
  async revokeDevice(deviceId) {
    try {
      // Deactivate device
      await prisma.device.update({
        where: { id: deviceId },
        data: { isActive: false }
      });

      // Revoke all sessions
      await prisma.session.updateMany({
        where: { deviceId },
        data: { isActive: false }
      });

      logger.info('Device access revoked', { deviceId });
      return { success: true };
    } catch (error) {
      logger.error('Error revoking device access', { error: error.message });
      throw new Error('Failed to revoke device access');
    }
  }
}

module.exports = new DeviceAuthService();
