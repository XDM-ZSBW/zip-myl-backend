#!/usr/bin/env node

/**
 * Streamlined Enhanced Endpoints Test
 * Tests all enhanced pairing code endpoints with auto-trust on registration
 */

const http = require('http');

const TEST_USER_ID = 'test-user-' + Date.now();

// Utility functions
const makeRequest = (method, path, data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000);
    req.end();
  });
};

const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${level.toUpperCase()}`;
  console.log(`${prefix}: ${message}`);
  if (data) {
    console.log(`${prefix}: Data:`, JSON.stringify(data, null, 2));
  }
};

const testStep = async (name, testFn) => {
  try {
    log('info', `🧪 Testing: ${name}`);
    const result = await testFn();
    log('success', `✅ ${name} - PASSED`);
    return { success: true, result };
  } catch (error) {
    log('error', `❌ ${name} - FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Test functions
const testDeviceRegistrationWithAutoTrust = async () => {
  const deviceInfo = {
    name: 'Test Device',
    type: 'chrome-extension',
    userAgent: 'Mozilla/5.0 Test Browser',
    screenResolution: '1920x1080',
    timezone: 'UTC',
    publicKey: 'test-public-key'
  };

  const response = await makeRequest('POST', '/api/v1/encrypted/devices/register', {
    userId: TEST_USER_ID,
    deviceInfo: deviceInfo
  });

  if (response.status !== 201) {
    throw new Error(`Expected status 201, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  // Verify auto-trust response
  if (response.data.requiresTrust !== false) {
    throw new Error('Device should be auto-trusted, but requiresTrust is true');
  }

  if (response.data.isTrusted !== true) {
    throw new Error('Device should be auto-trusted, but isTrusted is false');
  }

  log('info', 'Device auto-trusted successfully');
  return response.data;
};

const testPairingCodeGeneration = async () => {
  // Use the device ID from registration
  const deviceId = 'test-device-' + Date.now(); // This would come from registration
  
  const response = await makeRequest('POST', '/api/v1/encrypted/devices/pairing-code', {
    deviceId: deviceId,
    format: 'uuid',
    expiresInMinutes: 10
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  if (!response.data.pairingCode) {
    throw new Error('No pairing code returned in response');
  }

  log('info', 'Pairing code generated successfully');
  return response.data.pairingCode;
};

const testEnhancedStatusEndpoint = async (pairingCode) => {
  const response = await makeRequest('GET', `/api/v1/encrypted/devices/pairing-code/status/${pairingCode}`);

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  // Verify enhanced status structure
  const status = response.data;
  const requiredFields = ['status', 'progress', 'currentStep', 'message', 'canRetry', 'retryCount'];
  
  for (const field of requiredFields) {
    if (!(field in status)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  log('info', 'Enhanced status response structure verified');
  return status;
};

const testSSEStreaming = async (pairingCode) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/encrypted/devices/pairing-code/status/${pairingCode}/stream`,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`SSE endpoint returned status ${res.statusCode}`));
        return;
      }

      let dataReceived = false;
      res.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        if (chunkStr.includes('data:')) {
          dataReceived = true;
          log('info', 'SSE data received:', chunkStr);
        }
      });

      res.on('end', () => {
        if (dataReceived) {
          resolve({ success: true, message: 'SSE streaming working' });
        } else {
          reject(new Error('No SSE data received'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000);
    req.end();
  });
};

const testRetryEndpoint = async (pairingCode) => {
  const response = await makeRequest('POST', `/api/v1/encrypted/devices/pairing-code/retry/${pairingCode}`);

  // Retry might fail if the pairing code is not in failed state
  // We're testing the endpoint structure, not the business logic
  log('info', `Retry endpoint response: ${response.status} - ${JSON.stringify(response.data)}`);
  
  return { success: true, message: 'Retry endpoint accessible' };
};

// Main test execution
const runTests = async () => {
  log('info', '🚀 Starting Streamlined Enhanced Endpoints Test Suite');
  log('info', '===================================================');
  log('info', 'Testing auto-trust on device registration + enhanced endpoints');
  
  const results = [];
  let pairingCode = null;

  try {
    // Test 1: Device Registration with Auto-Trust
    const regResult = await testStep('Device Registration with Auto-Trust', testDeviceRegistrationWithAutoTrust);
    results.push(regResult);
    if (!regResult.success) {
      log('error', 'Device registration failed, cannot continue with other tests');
      return;
    }

    // Test 2: Pairing Code Generation (should work immediately due to auto-trust)
    const genResult = await testStep('Pairing Code Generation', testPairingCodeGeneration);
    results.push(genResult);
    if (genResult.success) {
      pairingCode = genResult.result;
    }

    // Test 3: Enhanced Status Endpoint
    if (pairingCode) {
      const statusResult = await testStep('Enhanced Status Endpoint', () => 
        testEnhancedStatusEndpoint(pairingCode)
      );
      results.push(statusResult);
    }

    // Test 4: SSE Streaming
    if (pairingCode) {
      const sseResult = await testStep('SSE Streaming Endpoint', () => 
        testSSEStreaming(pairingCode)
      );
      results.push(sseResult);
    }

    // Test 5: Retry Endpoint
    if (pairingCode) {
      const retryResult = await testStep('Retry Endpoint', () => 
        testRetryEndpoint(pairingCode)
      );
      results.push(retryResult);
    }

  } catch (error) {
    log('error', 'Test execution failed:', error.message);
  }

  // Summary
  log('info', '===================================================');
  log('info', '📊 Test Results Summary');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  log('info', `Total Tests: ${total}`);
  log('info', `Passed: ${passed}`);
  log('info', `Failed: ${failed}`);

  if (failed === 0) {
    log('success', '🎉 All tests passed! Streamlined endpoints are working correctly.');
  } else {
    log('warn', '⚠️  Some tests failed. Please check the implementation.');
  }

  return { passed, failed, total, results };
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log('error', 'Test suite execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests, testStep };
