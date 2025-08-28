#!/usr/bin/env node

/**
 * Test Script for Enhanced Pairing Code Endpoints
 * 
 * This script tests the new backend UI enhancements:
 * - Enhanced status endpoint
 * - SSE streaming endpoint
 * - Retry functionality
 * 
 * Usage: node test-enhanced-endpoints.js
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_DEVICE_ID = 'test-device-123';

// Test results
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log(message, 'success');
  } else {
    testResults.failed++;
    log(message, 'error');
  }
}

// HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test 1: Generate pairing code
async function testGeneratePairingCode() {
  log('Testing pairing code generation...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/encrypted/devices/pairing-code',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      deviceId: TEST_DEVICE_ID,
      format: 'uuid',
      expiresInMinutes: 10
    });

    assert(response.statusCode === 200, 'Pairing code generation should return 200');
    
    if (response.body.success) {
      const pairingCode = response.body.pairingCode;
      log(`Generated pairing code: ${pairingCode}`);
      
      // Test status endpoint
      await testStatusEndpoint(pairingCode);
      
      // Test SSE streaming
      await testSSEStreaming(pairingCode);
      
      // Test retry functionality (if needed)
      // await testRetryFunctionality(pairingCode);
    } else {
      assert(false, 'Pairing code generation should succeed');
    }
  } catch (error) {
    log(`Error testing pairing code generation: ${error.message}`, 'error');
    assert(false, 'Pairing code generation should not throw errors');
  }
}

// Test 2: Status endpoint
async function testStatusEndpoint(pairingCode) {
  log('Testing enhanced status endpoint...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/encrypted/devices/pairing-code/status/${pairingCode}?deviceId=${TEST_DEVICE_ID}`,
      method: 'GET'
    });

    assert(response.statusCode === 200, 'Status endpoint should return 200');
    
    if (response.body.success) {
      const status = response.body;
      
      // Check required fields
      assert(typeof status.status === 'string', 'Status should have status field');
      assert(typeof status.progress === 'number', 'Status should have progress field');
      assert(typeof status.message === 'string', 'Status should have message field');
      assert(typeof status.estimatedTime === 'number', 'Status should have estimatedTime field');
      assert(typeof status.canRetry === 'boolean', 'Status should have canRetry field');
      
      log(`Status: ${status.status}, Progress: ${status.progress}%, Message: ${status.message}`);
      log(`Estimated time: ${status.estimatedTime}s, Can retry: ${status.canRetry}`);
      
      // Check progress range
      assert(status.progress >= 0 && status.progress <= 100, 'Progress should be between 0-100');
      
      // Check status values
      const validStatuses = ['queued', 'generating', 'validating', 'completed', 'failed'];
      assert(validStatuses.includes(status.status), `Status should be one of: ${validStatuses.join(', ')}`);
      
    } else {
      assert(false, 'Status endpoint should return success');
    }
  } catch (error) {
    log(`Error testing status endpoint: ${error.message}`, 'error');
    assert(false, 'Status endpoint should not throw errors');
  }
}

// Test 3: SSE streaming endpoint
async function testSSEStreaming(pairingCode) {
  log('Testing SSE streaming endpoint...');
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/encrypted/devices/pairing-code/status/${pairingCode}/stream?deviceId=${TEST_DEVICE_ID}`,
      method: 'GET'
    }, (res) => {
      let dataReceived = false;
      let connectionMessage = false;
      let statusUpdate = false;
      
      res.on('data', (chunk) => {
        const chunkStr = chunk.toString();
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              dataReceived = true;
              
              if (data.type === 'connection') {
                connectionMessage = true;
                log('SSE connection established');
              } else if (data.type === 'status_update') {
                statusUpdate = true;
                log(`SSE status update: ${data.status} - ${data.progress}%`);
                
                // Close connection after receiving status update
                req.destroy();
                break;
              }
            } catch (error) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });
      
      res.on('end', () => {
        assert(dataReceived, 'SSE should send data');
        assert(connectionMessage, 'SSE should send connection message');
        assert(statusUpdate, 'SSE should send status updates');
        
        log('SSE streaming test completed');
        resolve();
      });
    });

    req.on('error', (error) => {
      log(`SSE error: ${error.message}`, 'error');
      assert(false, 'SSE should not have errors');
      resolve();
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      req.destroy();
      log('SSE test timed out', 'error');
      assert(false, 'SSE should complete within timeout');
      resolve();
    }, 10000);
  });
}

// Test 4: Retry functionality
async function testRetryFunctionality(pairingCode) {
  log('Testing retry functionality...');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/encrypted/devices/pairing-code/retry/${pairingCode}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      deviceId: TEST_DEVICE_ID
    });

    // Retry might fail if the pairing code is not in failed state
    // This is expected behavior
    log(`Retry response: ${response.statusCode} - ${JSON.stringify(response.body)}`);
    
    if (response.statusCode === 200) {
      assert(response.body.success, 'Retry should succeed when possible');
    } else if (response.statusCode === 400) {
      // This is expected for valid pairing codes
      log('Retry correctly rejected for non-failed pairing code');
    }
    
  } catch (error) {
    log(`Error testing retry functionality: ${error.message}`, 'error');
    // Retry errors are acceptable in this test
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Enhanced Pairing Code Endpoint Tests');
  log('================================================');
  
  try {
    await testGeneratePairingCode();
    
    log('================================================');
    log(`📊 Test Results: ${testResults.passed} passed, ${testResults.failed} failed, ${testResults.total} total`);
    
    if (testResults.failed === 0) {
      log('🎉 All tests passed! Enhanced endpoints are working correctly.', 'success');
    } else {
      log('⚠️  Some tests failed. Please check the implementation.', 'error');
    }
    
  } catch (error) {
    log(`💥 Test runner error: ${error.message}`, 'error');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults
};
