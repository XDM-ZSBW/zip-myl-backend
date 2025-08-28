/**
 * Extension-Specific Test Utilities
 * Helper functions for testing Chrome extension integration
 */

const request = require('supertest');
const { extensionTestUtils } = require('../mocks/chromeExtension');

/**
 * Create a mock extension request with proper headers
 */
function createExtensionRequest(extensionId, endpoint, data = {}) {
  return {
    headers: {
      'x-extension-id': extensionId,
      'x-extension-version': '2.0.0',
      'x-client-type': 'chrome-extension',
      'Content-Type': 'application/json',
      'Origin': `chrome-extension://${extensionId}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: data,
    url: endpoint,
  };
}

/**
 * Create a mock extension context for testing
 */
function createExtensionContext(overrides = {}) {
  return {
    extensionId: 'test-extension-id-1234567890abcdef',
    version: '2.0.0',
    permissions: ['https://api.myl.zip/*'],
    storage: {
      deviceId: 'test-device-123',
      extensionSettings: {
        theme: 'dark',
        autoSync: true,
        nftFormat: 'uuid',
        pairingCodeFormat: 'uuid',
      },
      pairingCodes: [],
      trustedDevices: [],
    },
    ...overrides,
  };
}

/**
 * Validate extension response format
 */
function validateExtensionResponse(response, expectedFields = []) {
  const requiredFields = ['success', 'timestamp', ...expectedFields];

  requiredFields.forEach(field => {
    expect(response.body).toHaveProperty(field);
  });

  if (response.body.success) {
    expect(response.body.success).toBe(true);
  }

  if (response.body.timestamp) {
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  }
}

/**
 * Test extension authentication flow
 */
async function testExtensionAuthFlow(app, extensionId) {
  // Step 1: Register device
  const registerResponse = await request(app)
    .post('/api/v1/encrypted/devices/register')
    .set('x-extension-id', extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send({
      deviceId: `chrome-extension-${extensionId}`,
      deviceInfo: {
        type: 'chrome-extension',
        version: '2.0.0',
        fingerprint: 'test-fingerprint-123',
      },
    });

  expect(registerResponse.status).toBe(200);
  expect(registerResponse.body.success).toBe(true);
  expect(registerResponse.body.deviceId).toBe(`chrome-extension-${extensionId}`);

  const sessionToken = registerResponse.body.sessionToken;

  // Step 2: Generate pairing code
  const pairingResponse = await request(app)
    .post('/api/v1/device-registration/pairing-codes')
    .set('x-extension-id', extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send({
      deviceId: `chrome-extension-${extensionId}`,
      format: 'uuid',
      expiresIn: 300,
    });

  expect(pairingResponse.status).toBe(200);
  expect(pairingResponse.body.success).toBe(true);
  expect(pairingResponse.body.format).toBe('uuid');

  return {
    sessionToken,
    pairingCode: pairingResponse.body.pairingCode,
    deviceId: `chrome-extension-${extensionId}`,
  };
}

/**
 * Test extension pairing workflow
 */
async function testExtensionPairingWorkflow(app, deviceA, deviceB) {
  // Step 1: Device A generates pairing code
  const generateResponse = await request(app)
    .post('/api/v1/device-registration/pairing-codes')
    .set('x-extension-id', deviceA.extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send({
      deviceId: deviceA.deviceId,
      format: 'uuid',
      expiresIn: 300,
    });

  expect(generateResponse.status).toBe(200);
  expect(generateResponse.body.success).toBe(true);

  const pairingCode = generateResponse.body.pairingCode;

  // Step 2: Device B enters pairing code
  const pairResponse = await request(app)
    .post('/api/v1/device-registration/pair')
    .set('x-extension-id', deviceB.extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send({
      deviceId: deviceB.deviceId,
      pairingCode,
      encryptedTrustData: 'encrypted-trust-data',
    });

  expect(pairResponse.status).toBe(200);
  expect(pairResponse.body.success).toBe(true);

  return {
    pairingCode,
    trustRelationship: pairResponse.body.trustRelationship,
  };
}

/**
 * Test extension CORS handling
 */
async function testExtensionCORS(app, endpoint, method = 'POST') {
  const extensionId = 'test-extension-id-1234567890abcdef';

  // Test preflight request
  const preflightResponse = await request(app)
    .options(endpoint)
    .set('Origin', `chrome-extension://${extensionId}`)
    .set('Access-Control-Request-Method', method)
    .set('Access-Control-Request-Headers', 'Content-Type, x-extension-id');

  expect(preflightResponse.status).toBe(200);
  expect(preflightResponse.headers['access-control-allow-origin']).toContain(`chrome-extension://${extensionId}`);
  expect(preflightResponse.headers['access-control-allow-methods']).toContain(method);

  // Test actual request
  const actualResponse = await request(app)
    [method.toLowerCase()](endpoint)
    .set('Origin', `chrome-extension://${extensionId}`)
    .set('x-extension-id', extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send(method === 'GET' ? {} : { deviceId: 'test-device-123' });

  expect(actualResponse.status).not.toBe(0); // Should not be CORS blocked
  expect(actualResponse.headers['access-control-allow-origin']).toContain(`chrome-extension://${extensionId}`);
}

/**
 * Test extension rate limiting
 */
async function testExtensionRateLimiting(app, endpoint, maxRequests = 5) {
  const extensionId = 'test-extension-id-1234567890abcdef';
  const requests = [];

  // Make multiple requests to trigger rate limiting
  for (let i = 0; i < maxRequests + 2; i++) {
    const response = await request(app)
      .post(endpoint)
      .set('x-extension-id', extensionId)
      .set('x-extension-version', '2.0.0')
      .set('x-client-type', 'chrome-extension')
      .send({
        deviceId: `test-device-${i}`,
        format: 'uuid',
      });

    requests.push({
      requestNumber: i + 1,
      status: response.status,
      body: response.body,
    });
  }

  // Check that rate limiting kicked in
  const successfulRequests = requests.filter(r => r.status === 200);
  const rateLimitedRequests = requests.filter(r => r.status === 429);

  expect(successfulRequests.length).toBeLessThanOrEqual(maxRequests);
  expect(rateLimitedRequests.length).toBeGreaterThan(0);

  return { requests, successfulRequests, rateLimitedRequests };
}

/**
 * Test extension error handling
 */
async function testExtensionErrorHandling(app, endpoint, invalidData) {
  const extensionId = 'test-extension-id-1234567890abcdef';

  const response = await request(app)
    .post(endpoint)
    .set('x-extension-id', extensionId)
    .set('x-extension-version', '2.0.0')
    .set('x-client-type', 'chrome-extension')
    .send(invalidData);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  expect(response.body.errorId).toBeDefined();

  return response;
}

/**
 * Test extension validation middleware
 */
async function testExtensionValidation(app, endpoint, testCases) {
  const results = [];

  for (const testCase of testCases) {
    const { description, headers, body, expectedStatus, expectedError } = testCase;

    const response = await request(app)
      .post(endpoint)
      .set(headers)
      .send(body);

    const result = {
      description,
      status: response.status,
      body: response.body,
      passed: response.status === expectedStatus,
    };

    if (expectedError) {
      result.passed = result.passed && response.body.error === expectedError;
    }

    results.push(result);
  }

  return results;
}

/**
 * Generate test extension data
 */
function generateTestExtensionData(overrides = {}) {
  const extensionId = `test-ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    extensionId,
    deviceId: `chrome-extension-${extensionId}`,
    version: '2.0.0',
    permissions: ['https://api.myl.zip/*', 'storage', 'activeTab'],
    settings: {
      theme: 'dark',
      autoSync: true,
      nftFormat: 'uuid',
      pairingCodeFormat: 'uuid',
    },
    ...overrides,
  };
}

/**
 * Mock extension storage operations
 */
function mockExtensionStorage(extensionId, data = {}) {
  const defaultData = {
    deviceId: `chrome-extension-${extensionId}`,
    extensionSettings: {
      theme: 'dark',
      autoSync: true,
      nftFormat: 'uuid',
      pairingCodeFormat: 'uuid',
    },
    pairingCodes: [],
    trustedDevices: [],
    nftCollection: [],
  };

  return { ...defaultData, ...data };
}

module.exports = {
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
};
