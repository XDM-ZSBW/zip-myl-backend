const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { PrismaClient } = require('@prisma/client');
const deviceAuth = require('../../src/auth/deviceAuth');
const jwtService = require('../../src/auth/jwtService');
const sessionManager = require('../../src/auth/sessionManager');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    device: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn()
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }))
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Device Authentication', () => {
  let mockPrisma;
  let mockReq;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    mockReq = {
      ip: '192.168.1.1',
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        };
        return headers[header];
      })
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
    it('should register a new device successfully', async () => {
      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue({
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        lastSeen: new Date()
      });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true
      });
      mockPrisma.device.update.mockResolvedValue({});

      const result = await deviceAuth.registerDevice(mockReq);

      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('refreshExpiresIn');
    });

    it('should return existing device if already registered', async () => {
      const existingDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        isActive: true
      };

      mockPrisma.device.findFirst.mockResolvedValue(existingDevice);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true
      });
      mockPrisma.device.update.mockResolvedValue({});

      const result = await deviceAuth.registerDevice(mockReq);

      expect(result.deviceId).toBe('device-123');
      expect(mockPrisma.device.create).not.toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const mockToken = 'valid-token';
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true }
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await deviceAuth.validateToken(mockToken);

      expect(result.isValid).toBe(true);
      expect(result.deviceId).toBe('device-123');
      expect(result.sessionId).toBe('session-123');
    });

    it('should reject an invalid token', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const result = await deviceAuth.validateToken('invalid-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('JWT Service', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
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

    it('should reject an invalid access token', () => {
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
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('refreshExpiresIn');
    });
  });
});

describe('Session Manager', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const sessionData = {
        deviceId: 'device-123',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      };

      mockPrisma.session.count.mockResolvedValue(0);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        ...sessionData
      });

      const result = await sessionManager.createSession(sessionData);

      expect(result).toHaveProperty('id');
      expect(result.deviceId).toBe('device-123');
    });
  });

  describe('getSessionByAccessToken', () => {
    it('should retrieve session by access token', async () => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true }
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const result = await sessionManager.getSessionByAccessToken('access-token');

      expect(result).toEqual(mockSession);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 5 });

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result.count).toBe(5);
      expect(mockPrisma.session.updateMany).toHaveBeenCalled();
    });
  });
});
