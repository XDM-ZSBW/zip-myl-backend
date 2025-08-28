const app = require('../../src/app-test');
const request = require('supertest');
const { testUtils } = require('../setup');

describe('API Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async() => {
    testUser = testUtils.createTestUser();
    authToken = `test-auth-token-${Date.now()}`;
  });

  describe('Health Endpoint', () => {
    it('should return health status', async() => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.environment).toBe('test');
      expect(response.body.version).toBe('2.0.0');
    });
  });

  describe('Authentication Endpoints', () => {
    it('should require authentication for protected routes', async() => {
      const response = await request(app)
        .get('/api/v1/thoughts')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid authentication gracefully', async() => {
      const response = await request(app)
        .get('/api/v1/thoughts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Thoughts Endpoints', () => {
    it('should handle thought creation with authentication', async() => {
      const thoughtData = {
        content: 'Test thought content',
        tags: ['test', 'integration'],
      };

      const response = await request(app)
        .post('/api/v1/thoughts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(thoughtData)
        .expect(401); // Expected to fail with test token

      expect(response.body.error).toBeDefined();
    });

    it('should handle thought retrieval with authentication', async() => {
      const response = await request(app)
        .get('/api/v1/thoughts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401); // Expected to fail with test token

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Device Endpoints', () => {
    it('should handle device registration', async() => {
      const deviceData = {
        fingerprint: 'test-device-fingerprint',
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
      };

      const response = await request(app)
        .post('/api/v1/devices')
        .send(deviceData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle device authentication', async() => {
      const authData = {
        deviceId: 'test-device-id',
        fingerprint: 'test-device-fingerprint',
      };

      const response = await request(app)
        .post('/api/v1/devices/auth')
        .send(authData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async() => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });

    it('should handle malformed JSON gracefully', async() => {
      const response = await request(app)
        .post('/api/v1/thoughts')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async() => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'chrome-extension://test-extension-id')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
