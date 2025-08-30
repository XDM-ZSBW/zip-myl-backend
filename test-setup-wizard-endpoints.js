/**
 * Test script for setup wizard endpoints
 * Tests the device status, verify, and generate-key endpoints
 */

const fetch = require('node-fetch');

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  deviceId: 'test-device-' + Date.now(),
  deviceName: 'Test Device',
  userInitials: 'TD'
};

async function makeRequest(method, endpoint, data = null) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    console.log(`${method} ${endpoint}:`, {
      status: response.status,
      success: result.success,
      message: result.message || result.error
    });
    
    return { response, result };
  } catch (error) {
    console.error(`Error ${method} ${endpoint}:`, error.message);
    return { response: null, result: null, error };
  }
}

async function testSetupWizardEndpoints() {
  console.log('🧪 Testing Setup Wizard Endpoints');
  console.log('================================');
  console.log(`Test Device ID: ${TEST_CONFIG.deviceId}`);
  console.log('');

  // Test 1: Device Status
  console.log('1. Testing Device Status...');
  const statusResult = await makeRequest('POST', '/api/v1/device/status', {
    deviceId: TEST_CONFIG.deviceId
  });

  // Test 2: Device Verify
  console.log('\n2. Testing Device Verify...');
  const verifyResult = await makeRequest('POST', '/api/v1/device/verify', {
    deviceId: TEST_CONFIG.deviceId,
    userAgent: 'Test User Agent',
    platform: 'Test Platform',
    language: 'en-US'
  });

  // Test 3: SSL Provision (this should work even without SSL service)
  console.log('\n3. Testing SSL Provision...');
  const sslResult = await makeRequest('POST', '/api/v1/ssl/provision', {
    deviceId: TEST_CONFIG.deviceId,
    uuidSubdomain: `${TEST_CONFIG.deviceId}.myl.zip`,
    userInitials: TEST_CONFIG.userInitials,
    deviceName: TEST_CONFIG.deviceName
  });

  // Test 4: Generate API Key
  console.log('\n4. Testing API Key Generation...');
  const keyResult = await makeRequest('POST', '/api/v1/device/generate-key', {
    deviceId: TEST_CONFIG.deviceId,
    deviceName: TEST_CONFIG.deviceName,
    userInitials: TEST_CONFIG.userInitials
  });

  console.log('\n✅ Setup Wizard Endpoint Tests Complete');
  console.log('=====================================');
  
  // Summary
  const tests = [
    { name: 'Device Status', result: statusResult },
    { name: 'Device Verify', result: verifyResult },
    { name: 'SSL Provision', result: sslResult },
    { name: 'API Key Generation', result: keyResult }
  ];

  tests.forEach(test => {
    const status = test.result.result?.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.name}`);
  });
}

// Run the test
if (require.main === module) {
  testSetupWizardEndpoints().catch(console.error);
}

module.exports = { testSetupWizardEndpoints, TEST_CONFIG };
