const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../src/app');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    device: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  })),
}));

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('Authentication API Endpoints', () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = new (require('@prisma/client').PrismaClient)();

    // Set up environment variables
    process.env.JWT_SECRET = 'test-secret-key-for-testing';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/device/register', () => {
    it('should register a new device successfully', async() => {
      const mockDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        lastSeen: new Date(),
      };

      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      };

      mockPrisma.device.findFirst.mockResolvedValue(null);
      mockPrisma.device.create.mockResolvedValue(mockDevice);
      mockPrisma.session.create.mockResolvedValue(mockSession);
      mockPrisma.device.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/device/register')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device registered successfully');
      expect(response.body.data).toHaveProperty('deviceId');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data).toHaveProperty('refreshExpiresIn');
    });

    it('should return existing device if already registered', async() => {
      const existingDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        refreshToken: 'hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      };

      mockPrisma.device.findFirst.mockResolvedValue(existingDevice);
      mockPrisma.session.create.mockResolvedValue(mockSession);
      mockPrisma.device.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/device/register')
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deviceId).toBe('device-123');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid refresh token', async() => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        refreshToken: 'hashed-refresh-token',
        isActive: true,
        refreshExpiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      const mockNewSession = {
        id: 'session-124',
        deviceId: 'device-123',
        accessToken: 'new-hashed-access-token',
        refreshToken: 'new-hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue(mockNewSession);
      mockPrisma.device.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data).toHaveProperty('deviceId');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid refresh token', async() => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Login failed');
    });

    it('should reject login without refresh token', async() => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refresh token required');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async() => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        refreshToken: 'hashed-refresh-token',
        isActive: true,
        refreshExpiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      const mockNewSession = {
        id: 'session-124',
        deviceId: 'device-123',
        accessToken: 'new-hashed-access-token',
        refreshToken: 'new-hashed-refresh-token',
        expiresAt: new Date(),
        refreshExpiresAt: new Date(),
        isActive: true,
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.session.create.mockResolvedValue(mockNewSession);
      mockPrisma.device.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });
  });

  describe('POST /api/v1/auth/validate', () => {
    it('should validate a valid token', async() => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/auth/validate')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token is valid');
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.deviceId).toBe('device-123');
    });

    it('should reject validation without token', async() => {
      const response = await request(app)
        .post('/api/v1/auth/validate')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Token required');
    });
  });

  describe('GET /api/v1/auth/device/info', () => {
    it('should get device info with valid token', async() => {
      const mockDevice = {
        id: 'device-123',
        fingerprint: 'fingerprint-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isActive: true,
        createdAt: new Date(),
        lastSeen: new Date(),
        sessions: [],
      };

      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      const response = await request(app)
        .get('/api/v1/auth/device/info')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device information retrieved successfully');
      expect(response.body.data.id).toBe('device-123');
    });

    it('should reject request without valid token', async() => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/auth/device/info')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully with valid token', async() => {
      const mockSession = {
        id: 'session-123',
        deviceId: 'device-123',
        accessToken: 'hashed-access-token',
        isActive: true,
        expiresAt: new Date(Date.now() + 60000),
        device: { isActive: true },
      };

      mockPrisma.session.findFirst.mockResolvedValue(mockSession);
      mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-access-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });
  });
});
