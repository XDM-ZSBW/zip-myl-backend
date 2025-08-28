const { PrismaClient } = require('@prisma/client');
const deviceAuth = require('../../src/auth/deviceAuth');
const jwtService = require('../../src/auth/jwtService');
const sessionManager = require('../../src/auth/sessionManager');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Device Authentication', () => {
  let mockReq;

  beforeEach(() => {
    mockReq = {
      ip: '192.168.1.1',
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        };
        return headers[header];
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate consistent fingerprint for same request', () => {
      const fingerprint1 = deviceAuth.generateDeviceFingerprint(mockReq);
      const fingerprint2 = deviceAuth.generateDeviceFingerprint(mockReq);

      expect(fingerprint1).toBe(fingerprint2);
      expect(fingerprint1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different fingerprints for different requests', () => {
      const fingerprint1 = deviceAuth.generateDeviceFingerprint(mockReq);

      mockReq.ip = '192.168.1.2';
      const fingerprint2 = deviceAuth.generateDeviceFingerprint(mockReq);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('registerDevice', () => {
    it('should register a new device successfully', async() => {
      const newDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        isActive: true,
      };

      // Mock device creation
      global.mockPrisma.device.findFirst.mockResolvedValue(null);
      global.mockPrisma.device.create.mockResolvedValue(newDevice);

      // Mock session creation
      global.mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      });

      // Mock device update
      global.mockPrisma.device.update.mockResolvedValue({});

      const result = await deviceAuth.registerDevice(mockReq);

      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('refreshExpiresIn');
    });

    it('should return existing device if already registered', async() => {
      const existingDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        isActive: true,
      };

      // Mock finding existing device
      global.mockPrisma.device.findFirst.mockResolvedValue(existingDevice);

      // Mock session creation
      global.mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      });

      // Mock device update
      global.mockPrisma.device.update.mockResolvedValue({});

      const result = await deviceAuth.registerDevice(mockReq);

      expect(result.deviceId).toBe('device-123');
      expect(global.mockPrisma.device.create).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async() => {
      // Create a proper JWT token for testing
      const jwt = require('jsonwebtoken');
      const mockToken = jwt.sign(
        { deviceId: 'device-123', type: 'device' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' },
      );

      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      // Mock the session lookup with the hashed token
      const crypto = require('crypto');
      const hashedToken = crypto.createHash('sha256').update(mockToken).digest('hex');

      global.mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await deviceAuth.validateToken(mockToken);

      expect(result.isValid).toBe(true);
      expect(result.deviceId).toBe('device-123');
      expect(result.sessionId).toBe('session-123');
    });

    it('should reject an invalid token', async() => {
      global.mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await deviceAuth.validateToken('invalid-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('JWT Service', () => {
  beforeEach(() => {
    // No need to set environment variables - using Google Secret Manager
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = { deviceId: 'device-123' };
      const token = jwtService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = { deviceId: 'device-123' };
      const token = jwtService.generateAccessToken(payload);
      const result = jwtService.verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload.deviceId).toBe('device-123');
    });

    it('should reject an invalid token', () => {
      const result = jwtService.verifyAccessToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const payload = { deviceId: 'device-123' };
      const result = jwtService.generateTokenPair(payload);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });
  });
});

describe('Session Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session', async() => {
      const sessionData = {
        deviceId: 'device-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      global.mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        ...sessionData,
      });

      const result = await sessionManager.createSession(sessionData);

      expect(result).toHaveProperty('id');
      expect(result.deviceId).toBe('device-123');
      // The actual implementation hashes tokens and adds isActive field
      expect(global.mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: 'device-123',
          accessToken: expect.any(String), // Hashed token
          refreshToken: expect.any(String), // Hashed token
          isActive: true,
        }),
      });
    });
  });

  describe('getSessionByAccessToken', () => {
    it('should retrieve session by access token', async() => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        isActive: true,
      };

      global.mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await sessionManager.getSessionByAccessToken('access-token');

      expect(result).toEqual(mockSession);
      // The actual implementation hashes the token and adds expiration check
      expect(global.mockPrisma.session.findFirst).toHaveBeenCalledWith({
        where: {
          accessToken: expect.any(String), // Hashed token
          expiresAt: { gt: expect.any(Date) }, // Expiration check
          isActive: true,
        },
        include: { device: true },
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async() => {
      global.mockPrisma.session.updateMany.mockResolvedValue({ count: 5 });

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result.count).toBe(5); // The result is an object with count property
      // The actual implementation checks both expiresAt and refreshExpiresAt
      expect(global.mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { refreshExpiresAt: { lt: expect.any(Date) } },
          ],
          isActive: true,
        },
        data: { isActive: false },
      });
    });
  });
});
