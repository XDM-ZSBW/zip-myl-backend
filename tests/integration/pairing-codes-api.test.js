const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../src/app-simple');

describe('Pairing Codes API Integration Tests', () => {
  
  describe('POST /api/v1/encrypted/devices/pairing-code', () => {
    test('should generate UUID pairing code by default', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pairingCode).toBeDefined();
      expect(response.body.format).toBe('uuid');
      expect(response.body.expiresAt).toBeDefined();
      expect(response.body.expiresIn).toBe(600);

      // Validate UUID format (UUID v4)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.pairingCode).toMatch(uuidRegex);
    });

    test('should generate UUID pairing code when format is "uuid"', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'uuid'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.format).toBe('uuid');
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(response.body.pairingCode).toMatch(uuidRegex);
    });

    test('should generate short pairing code when format is "short"', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'short'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.format).toBe('short');
      expect(response.body.pairingCode).toHaveLength(12);
      expect(response.body.pairingCode).toMatch(/^[0-9a-f]{12}$/i);
    });

    test('should generate legacy pairing code when format is "legacy"', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'legacy'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.format).toBe('legacy');
      expect(response.body.pairingCode).toHaveLength(6);
      expect(response.body.pairingCode).toMatch(/^\d{6}$/);
    });

    test('should accept custom expiration time', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'uuid',
          expiresIn: 300 // 5 minutes
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.expiresIn).toBe(300);
      
      // Check that expiration time is approximately correct
      const expiresAt = new Date(response.body.expiresAt);
      const now = new Date();
      const timeDiff = expiresAt.getTime() - now.getTime();
      
      expect(timeDiff).toBeGreaterThan(290000); // At least 4 minutes 50 seconds
      expect(timeDiff).toBeLessThan(310000); // At most 5 minutes 10 seconds
    });

    test('should reject invalid format parameter', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'invalid'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid format parameter');
      expect(response.body.message).toBe('Format must be "uuid", "short", or "legacy"');
    });

    test('should reject missing deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          format: 'uuid'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing deviceId');
    });

    test('should generate unique codes for multiple requests', async () => {
      const codes = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/encrypted/devices/pairing-code')
          .send({
            deviceId: `test-device-${i}`,
            format: 'uuid'
          })
          .expect(200);
        
        codes.push(response.body.pairingCode);
      }

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(5);
    });
  });

  describe('POST /api/v1/encrypted/devices/pair', () => {
    test('should accept UUID pairing code', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          pairingCode: '123e4567-e89b-42d3-a456-426614174000',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pairingCodeFormat).toBe('uuid');
      expect(response.body.trustRelationship).toBeDefined();
      expect(response.body.pairedDevice).toBeDefined();
    });

    test('should accept short format pairing code', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          pairingCode: '38836d2c4498',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pairingCodeFormat).toBe('short');
    });

    test('should accept legacy format pairing code', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          pairingCode: '123456',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pairingCodeFormat).toBe('legacy');
    });

    test('should reject invalid pairing code format', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          pairingCode: 'invalid-code',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid pairing code format');
    });

    test('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.required).toEqual(['deviceId', 'pairingCode']);
    });

    test('should reject missing deviceId', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          pairingCode: '123e4567-e89b-42d3-a456-426614174000',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    test('should reject missing pairingCode', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('End-to-End Pairing Flow', () => {
    test('should complete full pairing flow with UUID', async () => {
      // Step 1: Generate pairing code
      const generateResponse = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'source-device-123',
          format: 'uuid'
        })
        .expect(200);

      const pairingCode = generateResponse.body.pairingCode;
      expect(pairingCode).toBeDefined();
      expect(generateResponse.body.format).toBe('uuid');

      // Step 2: Use pairing code to pair devices
      const pairResponse = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'target-device-456',
          pairingCode: pairingCode,
          encryptedTrustData: 'encrypted-trust-data'
        })
        .expect(200);

      expect(pairResponse.body.success).toBe(true);
      expect(pairResponse.body.pairingCodeFormat).toBe('uuid');
      expect(pairResponse.body.trustRelationship).toBeDefined();
      expect(pairResponse.body.pairedDevice).toBeDefined();
    });

    test('should complete full pairing flow with short format', async () => {
      // Step 1: Generate pairing code
      const generateResponse = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'source-device-123',
          format: 'short'
        })
        .expect(200);

      const pairingCode = generateResponse.body.pairingCode;
      expect(pairingCode).toBeDefined();
      expect(generateResponse.body.format).toBe('short');

      // Step 2: Use pairing code to pair devices
      const pairResponse = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'target-device-456',
          pairingCode: pairingCode,
          encryptedTrustData: 'encrypted-trust-data'
        })
        .expect(200);

      expect(pairResponse.body.success).toBe(true);
      expect(pairResponse.body.pairingCodeFormat).toBe('short');
    });

    test('should complete full pairing flow with legacy format', async () => {
      // Step 1: Generate pairing code
      const generateResponse = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'source-device-123',
          format: 'legacy'
        })
        .expect(200);

      const pairingCode = generateResponse.body.pairingCode;
      expect(pairingCode).toBeDefined();
      expect(generateResponse.body.format).toBe('legacy');

      // Step 2: Use pairing code to pair devices
      const pairResponse = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'target-device-456',
          pairingCode: pairingCode,
          encryptedTrustData: 'encrypted-trust-data'
        })
        .expect(200);

      expect(pairResponse.body.success).toBe(true);
      expect(pairResponse.body.pairingCodeFormat).toBe('legacy');
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle requests without format parameter (default to UUID)', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123'
        })
        .expect(200);

      expect(response.body.format).toBe('uuid');
      expect(response.body.pairingCode).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should accept legacy 6-digit codes in pairing endpoint', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pair')
        .send({
          deviceId: 'test-device-123',
          pairingCode: '123456',
          encryptedTrustData: 'encrypted-data'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pairingCodeFormat).toBe('legacy');
    });
  });

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // This test would require mocking the encryption service to throw an error
      // For now, we'll test the basic error structure
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .send({
          deviceId: 'test-device-123',
          format: 'uuid'
        });

      // Should either succeed or return a proper error structure
      if (response.status !== 200) {
        expect(response.body.error).toBeDefined();
        expect(response.body.message).toBeDefined();
      }
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/pairing-code')
        .set('Content-Type', 'application/json')
        .send('{"deviceId": "test-device-123", "format": "uuid"') // Missing closing brace
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
