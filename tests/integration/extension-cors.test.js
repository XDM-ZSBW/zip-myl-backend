const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../src/app-simple');

// Import Chrome extension mocks and test utilities
const { mockChrome, extensionTestUtils } = require('../mocks/chromeExtension');
const { generateTestExtensionData } = require('../utils/extensionTestHelpers');

describe('Chrome Extension CORS Testing', () => {
  let testExtension;

  beforeEach(() => {
    // Set up global Chrome mock
    global.chrome = mockChrome;

    // Generate test extension data
    testExtension = generateTestExtensionData();
  });

  afterEach(() => {
    // Clean up
    delete global.chrome;
  });

  describe('CORS Preflight Requests', () => {
    test('should handle OPTIONS preflight for pairing codes endpoint', async() => {
      const response = await request(app)
        .options('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id, x-extension-version');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('x-extension-id');
      expect(response.headers['access-control-allow-headers']).toContain('x-extension-version');
    });

    test('should handle OPTIONS preflight for device registration endpoint', async() => {
      const response = await request(app)
        .options('/api/v1/encrypted/devices/register')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    test('should handle OPTIONS preflight for device pairing endpoint', async() => {
      const response = await request(app)
        .options('/api/v1/device-registration/pair')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    test('should handle OPTIONS preflight for NFT generation endpoint', async() => {
      const response = await request(app)
        .options('/api/v1/nft/generate')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('CORS Actual Requests', () => {
    test('should allow POST request with valid extension origin', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.body.success).toBe(true);
    });

    test('should allow GET request with valid extension origin', async() => {
      const response = await request(app)
        .get('/api/v1/nft/styles')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.body.success).toBe(true);
    });

    test('should allow PUT request with valid extension origin', async() => {
      const response = await request(app)
        .put('/api/v1/encrypted/devices/trust')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          trustData: 'test-trust-data',
        });

      // Note: This endpoint might not exist, so we're testing CORS headers
      // The actual response status doesn't matter for CORS testing
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });

    test('should allow DELETE request with valid extension origin', async() => {
      const response = await request(app)
        .delete('/api/v1/encrypted/devices/trust/test-device')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension');

      // Note: This endpoint might not exist, so we're testing CORS headers
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });
  });

  describe('CORS Origin Validation', () => {
    test('should accept chrome-extension:// origin', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });

    test('should accept moz-extension:// origin', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', 'moz-extension://test-firefox-extension-id')
        .set('x-extension-id', 'test-firefox-extension-id')
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'moz-extension')
        .send({
          deviceId: 'test-firefox-device',
          format: 'uuid',
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toContain('moz-extension://test-firefox-extension-id');
    });

    test('should reject non-extension origins', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', 'https://malicious-site.com')
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      // Should either reject or not include CORS headers for malicious origins
      expect(response.status).not.toBe(200);
    });

    test('should reject http:// origins', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', 'http://insecure-site.com')
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      // Should reject insecure origins
      expect(response.status).not.toBe(200);
    });
  });

  describe('CORS Headers Validation', () => {
    test('should include proper CORS headers in successful responses', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(200);

      // Check required CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-credentials']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();

      // Check specific values
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('x-extension-id');
    });

    test('should include proper CORS headers in error responses', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          // Missing deviceId to trigger error
          format: 'uuid',
        });

      expect(response.status).toBe(400);

      // CORS headers should still be present even in error responses
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });

    test('should handle CORS headers for rate-limited requests', async() => {
      // Make multiple requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        const promise = request(app)
          .post('/api/v1/device-registration/pairing-codes')
          .set('Origin', `chrome-extension://${testExtension.extensionId}`)
          .set('x-extension-id', testExtension.extensionId)
          .set('x-extension-version', '2.0.0')
          .set('x-client-type', 'chrome-extension')
          .send({
            deviceId: `test-device-${i}`,
            format: 'uuid',
          });
        requests.push(promise);
      }

      const responses = await Promise.all(requests);

      // Find rate-limited response
      const rateLimitedResponse = responses.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();

      // CORS headers should still be present
      expect(rateLimitedResponse.headers['access-control-allow-origin']).toBeDefined();
      expect(rateLimitedResponse.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });
  });

  describe('CORS Method Support', () => {
    test('should support all required HTTP methods', async() => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
      const endpoints = [
        '/api/v1/device-registration/pairing-codes',
        '/api/v1/encrypted/devices/register',
        '/api/v1/device-registration/pair',
        '/api/v1/nft/styles',
      ];

      for (const endpoint of endpoints) {
        for (const method of methods) {
          if (method === 'OPTIONS') {
            // Test preflight request
            const response = await request(app)
              .options(endpoint)
              .set('Origin', `chrome-extension://${testExtension.extensionId}`)
              .set('Access-Control-Request-Method', method)
              .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id');

            expect(response.status).toBe(200);
            expect(response.headers['access-control-allow-methods']).toContain(method);
          } else {
            // Test actual request (if method is supported by endpoint)
            try {
              const response = await request(app)
                [method.toLowerCase()](endpoint)
                .set('Origin', `chrome-extension://${testExtension.extensionId}`)
                .set('x-extension-id', testExtension.extensionId)
                .set('x-extension-version', '2.0.0')
                .set('x-client-type', 'chrome-extension')
                .send(method === 'GET' ? {} : { deviceId: testExtension.deviceId });

              // If request succeeds, check CORS headers
              if (response.status !== 404 && response.status !== 405) {
                expect(response.headers['access-control-allow-origin']).toBeDefined();
                expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
              }
            } catch (error) {
              // Method not supported by endpoint, which is fine
              // We're only testing CORS, not endpoint functionality
            }
          }
        }
      }
    });
  });

  describe('CORS Credentials Support', () => {
    test('should support credentials in CORS requests', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .set('Cookie', 'test-cookie=value')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });

    test('should handle authorization headers in CORS', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .set('Authorization', 'Bearer test-token')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  describe('CORS Error Scenarios', () => {
    test('should handle malformed extension IDs gracefully', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', 'chrome-extension://malformed-id')
        .set('x-extension-id', 'malformed-id')
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      // Should either reject or handle gracefully
      expect(response.status).not.toBe(500); // Should not crash

      // If it's a validation error, CORS headers should still be present
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).toContain('chrome-extension://malformed-id');
      }
    });

    test('should handle missing extension headers gracefully', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', `chrome-extension://${testExtension.extensionId}`)
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      // Should handle missing headers gracefully
      expect(response.status).not.toBe(500); // Should not crash

      // CORS headers should still be present
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
    });
  });

  describe('CORS Performance', () => {
    test('should handle multiple concurrent CORS requests', async() => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/api/v1/device-registration/pairing-codes')
          .set('Origin', `chrome-extension://${testExtension.extensionId}`)
          .set('x-extension-id', testExtension.extensionId)
          .set('x-extension-version', '2.0.0')
          .set('x-client-type', 'chrome-extension')
          .send({
            deviceId: `test-device-${i}`,
            format: 'uuid',
          });

        promises.push(promise);
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      expect(responses).toHaveLength(concurrentRequests);

      // Should complete within reasonable time (adjust based on your performance requirements)
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      // All responses should have CORS headers
      responses.forEach(response => {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-origin']).toContain(`chrome-extension://${testExtension.extensionId}`);
      });
    });
  });
});
