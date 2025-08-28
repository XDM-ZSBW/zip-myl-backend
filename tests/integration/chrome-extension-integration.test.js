const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const request = require('supertest');
const app = require('../../src/app-simple');

// Import Chrome extension mocks and test utilities
const { mockChrome, extensionTestUtils } = require('../mocks/chromeExtension');
const {
  createExtensionRequest,
  createExtensionContext,
  validateExtensionResponse,
  testExtensionAuthFlow,
  testExtensionPairingWorkflow,
  testExtensionCORS,
  testExtensionRateLimiting,
  testExtensionErrorHandling,
  testExtensionValidation,
  generateTestExtensionData,
  mockExtensionStorage,
} = require('../utils/extensionTestHelpers');

describe('Chrome Extension Integration Tests', () => {
  let testExtension;

  beforeEach(() => {
    // Set up global Chrome mock
    global.chrome = mockChrome;

    // Generate test extension data
    testExtension = generateTestExtensionData();

    // Reset all mocks
    extensionTestUtils.resetMocks();
  });

  afterEach(() => {
    // Clean up
    delete global.chrome;
  });

  describe('Extension Environment Setup', () => {
    test('should have Chrome extension APIs available', () => {
      expect(global.chrome).toBeDefined();
      expect(global.chrome.runtime).toBeDefined();
      expect(global.chrome.storage).toBeDefined();
      expect(global.chrome.tabs).toBeDefined();
      expect(global.chrome.permissions).toBeDefined();
    });

    test('should have valid extension ID format', () => {
      const extensionId = testExtension.extensionId;
      expect(extensionId).toMatch(/^test-ext-\d+-[a-z0-9]{9}$/);
    });

    test('should have proper extension permissions', () => {
      const permissions = testExtension.permissions;
      expect(permissions).toContain('https://api.myl.zip/*');
      expect(permissions).toContain('storage');
      expect(permissions).toContain('activeTab');
    });
  });

  describe('Extension Authentication Flow', () => {
    test('should complete full authentication workflow', async() => {
      const authResult = await testExtensionAuthFlow(app, testExtension.extensionId);

      expect(authResult.sessionToken).toBeDefined();
      expect(authResult.pairingCode).toBeDefined();
      expect(authResult.deviceId).toBe(`chrome-extension-${testExtension.extensionId}`);

      // Verify UUID format
      expect(authResult.pairingCode).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should handle device registration with extension headers', async() => {
      const response = await request(app)
        .post('/api/v1/encrypted/devices/register')
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          deviceInfo: {
            type: 'chrome-extension',
            version: '2.0.0',
            fingerprint: 'test-fingerprint-123',
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.deviceId).toBe(testExtension.deviceId);
      expect(response.body.sessionToken).toBeDefined();
    });
  });

  describe('Extension Pairing Workflow', () => {
    test('should complete device pairing workflow', async() => {
      const deviceA = {
        extensionId: testExtension.extensionId,
        deviceId: testExtension.deviceId,
      };

      const deviceB = {
        extensionId: 'test-ext-device-b-1234567890abcdef',
        deviceId: 'chrome-extension-test-ext-device-b-1234567890abcdef',
      };

      const pairingResult = await testExtensionPairingWorkflow(app, deviceA, deviceB);

      expect(pairingResult.pairingCode).toBeDefined();
      expect(pairingResult.trustRelationship).toBeDefined();
      expect(pairingResult.trustRelationship.id).toBeDefined();
      expect(pairingResult.trustRelationship.trustLevel).toBe(1);
    });

    test('should generate UUID pairing codes for extensions', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
          expiresIn: 300,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.format).toBe('uuid');
      expect(response.body.pairingCode).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('Extension CORS Handling', () => {
    test('should handle CORS for pairing code generation', async() => {
      await testExtensionCORS(
        app,
        '/api/v1/device-registration/pairing-codes',
        'POST',
      );
    });

    test('should handle CORS for device registration', async() => {
      await testExtensionCORS(
        app,
        '/api/v1/encrypted/devices/register',
        'POST',
      );
    });

    test('should handle CORS for device pairing', async() => {
      await testExtensionCORS(
        app,
        '/api/v1/device-registration/pair',
        'POST',
      );
    });

    test('should reject invalid extension origins', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('Origin', 'https://malicious-site.com')
        .set('x-extension-id', testExtension.extensionId)
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      // Should either reject or not include CORS headers
      expect(response.status).not.toBe(200);
    });
  });

  describe('Extension Rate Limiting', () => {
    test('should apply rate limiting to extension requests', async() => {
      const rateLimitResult = await testExtensionRateLimiting(
        app,
        '/api/v1/device-registration/pairing-codes',
        5,
      );

      expect(rateLimitResult.successfulRequests.length).toBeLessThanOrEqual(5);
      expect(rateLimitResult.rateLimitedRequests.length).toBeGreaterThan(0);

      // Verify rate limit response format
      const rateLimitedResponse = rateLimitResult.rateLimitedRequests[0];
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.error).toBeDefined();
      expect(rateLimitedResponse.body.message).toBeDefined();
    });

    test('should have different rate limits for different endpoints', async() => {
      // Test auth endpoint rate limiting
      const authRateLimit = await testExtensionRateLimiting(
        app,
        '/api/v1/encrypted/devices/register',
        3,
      );

      expect(authRateLimit.successfulRequests.length).toBeLessThanOrEqual(3);
      expect(authRateLimit.rateLimitedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Extension Error Handling', () => {
    test('should handle missing extension ID', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Extension ID required');
      expect(response.body.code).toBe('MISSING_EXTENSION_ID');
    });

    test('should handle invalid extension ID format', async() => {
      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('x-extension-id', 'invalid-extension-id')
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid extension ID format');
      expect(response.body.code).toBe('INVALID_EXTENSION_ID');
    });

    test('should handle missing required fields', async() => {
      const response = await testExtensionErrorHandling(
        app,
        '/api/v1/device-registration/pairing-codes',
        {
          // Missing deviceId
          format: 'uuid',
        },
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.errorId).toBeDefined();
    });
  });

  describe('Extension Validation Middleware', () => {
    test('should validate extension headers correctly', async() => {
      const testCases = [
        {
          description: 'Valid extension request',
          headers: {
            'x-extension-id': testExtension.extensionId,
            'x-extension-version': '2.0.0',
            'x-client-type': 'chrome-extension',
          },
          body: { deviceId: testExtension.deviceId, format: 'uuid' },
          expectedStatus: 200,
        },
        {
          description: 'Missing extension ID',
          headers: {
            'x-extension-version': '2.0.0',
            'x-client-type': 'chrome-extension',
          },
          body: { deviceId: testExtension.deviceId, format: 'uuid' },
          expectedStatus: 401,
          expectedError: 'Extension ID required',
        },
        {
          description: 'Invalid extension ID format',
          headers: {
            'x-extension-id': 'invalid-id',
            'x-extension-version': '2.0.0',
            'x-client-type': 'chrome-extension',
          },
          body: { deviceId: testExtension.deviceId, format: 'uuid' },
          expectedStatus: 401,
          expectedError: 'Invalid extension ID format',
        },
      ];

      const results = await testExtensionValidation(
        app,
        '/api/v1/device-registration/pairing-codes',
        testCases,
      );

      // All test cases should pass
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Extension Storage Integration', () => {
    test('should mock extension storage operations', () => {
      const storageData = mockExtensionStorage(testExtension.extensionId, {
        theme: 'light',
        autoSync: false,
      });

      expect(storageData.deviceId).toBe(`chrome-extension-${testExtension.extensionId}`);
      expect(storageData.extensionSettings.theme).toBe('light');
      expect(storageData.extensionSettings.autoSync).toBe(false);
      expect(storageData.extensionSettings.nftFormat).toBe('uuid');
    });

    test('should handle extension storage get operations', async() => {
      const mockData = {
        deviceId: testExtension.deviceId,
        theme: 'dark',
        autoSync: true,
      };

      mockChrome.storage.local.get.mockResolvedValue(mockData);

      const result = await mockChrome.storage.local.get(['deviceId', 'theme']);
      expect(result).toEqual(mockData);
    });

    test('should handle extension storage set operations', async() => {
      const mockData = { theme: 'light' };
      mockChrome.storage.local.set.mockResolvedValue();

      await mockChrome.storage.local.set(mockData);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(mockData);
    });
  });

  describe('Extension Permissions', () => {
    test('should verify extension permissions', async() => {
      const requiredPermissions = ['https://api.myl.zip/*', 'storage'];
      const hasPermissions = await mockChrome.permissions.contains(requiredPermissions);

      expect(hasPermissions).toBe(true);
      expect(mockChrome.permissions.contains).toHaveBeenCalledWith(requiredPermissions);
    });

    test('should request new permissions', async() => {
      const newPermissions = ['https://example.com/*'];
      const granted = await mockChrome.permissions.request(newPermissions);

      expect(granted).toBe(true);
      expect(mockChrome.permissions.request).toHaveBeenCalledWith(newPermissions);
    });
  });

  describe('Extension Message Handling', () => {
    test('should handle extension messages', () => {
      const message = { type: 'GET_DEVICE_INFO' };
      const sender = { tab: { id: 1 } };
      const sendResponse = jest.fn();

      extensionTestUtils.simulateMessage(message, sender, sendResponse);

      // Verify that message listeners were registered
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should create extension connections', () => {
      const port = mockChrome.runtime.connect();

      expect(port).toBeDefined();
      expect(port.postMessage).toBeDefined();
      expect(port.onMessage).toBeDefined();
      expect(port.disconnect).toBeDefined();
    });
  });

  describe('Extension Tab Management', () => {
    test('should query active tabs', async() => {
      const tabs = await mockChrome.tabs.query({ active: true });

      expect(tabs).toHaveLength(2);
      expect(tabs[0].active).toBe(true);
      expect(tabs[1].active).toBe(false);
      expect(mockChrome.tabs.query).toHaveBeenCalledWith({ active: true });
    });

    test('should get specific tab', async() => {
      const tab = await mockChrome.tabs.get(1);

      expect(tab.id).toBe(1);
      expect(tab.url).toBe('https://example.com');
      expect(mockChrome.tabs.get).toHaveBeenCalledWith(1);
    });
  });

  describe('Extension Notifications', () => {
    test('should create notifications', async() => {
      const notificationOptions = {
        type: 'basic',
        title: 'Test Notification',
        message: 'This is a test notification',
      };

      const notificationId = await mockChrome.notifications.create(notificationOptions);

      expect(notificationId).toMatch(/^notification_\d+$/);
      expect(mockChrome.notifications.create).toHaveBeenCalledWith(notificationOptions);
    });

    test('should check notification permission level', async() => {
      const permissionLevel = await mockChrome.notifications.getPermissionLevel();

      expect(permissionLevel).toBe('granted');
      expect(mockChrome.notifications.getPermissionLevel).toHaveBeenCalled();
    });
  });

  describe('Extension Internationalization', () => {
    test('should get localized messages', () => {
      const extensionName = mockChrome.i18n.getMessage('extensionName');
      const pairingMessage = mockChrome.i18n.getMessage('pairingCodeGenerated');

      expect(extensionName).toBe('Myl.Zip Extension');
      expect(pairingMessage).toBe('Pairing code generated successfully');
    });

    test('should detect UI language', () => {
      const uiLanguage = mockChrome.i18n.getUILanguage();

      expect(uiLanguage).toBe('en');
      expect(mockChrome.i18n.getUILanguage).toHaveBeenCalled();
    });
  });

  describe('Extension Performance', () => {
    test('should handle concurrent extension requests', async() => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app)
          .post('/api/v1/device-registration/pairing-codes')
          .set('x-extension-id', testExtension.extensionId)
          .set('x-extension-version', '2.0.0')
          .set('x-client-type', 'chrome-extension')
          .send({
            deviceId: `test-device-${i}`,
            format: 'uuid',
          });

        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle extension request timeouts gracefully', async() => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/v1/device-registration/pairing-codes')
        .set('x-extension-id', testExtension.extensionId)
        .set('x-extension-version', '2.0.0')
        .set('x-client-type', 'chrome-extension')
        .send({
          deviceId: testExtension.deviceId,
          format: 'uuid',
        });

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
