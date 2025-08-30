const https = require('https');
const http = require('http');

// Test data
const testData = {
  deviceId: 'test123',
  uuidSubdomain: 'test123.myl.zip',
  userInitials: 'JD',
  deviceName: 'Test Device'
};

// Test local endpoint
function testLocalEndpoint() {
  console.log('🔍 Testing local endpoint...');
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/ssl/setup-wizard/provision',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📡 Local Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 Local Response Body:', data);
      console.log('✅ Local test completed');
    });
  });

  req.on('error', (e) => {
    console.error('❌ Local test error:', e.message);
  });

  req.write(postData);
  req.end();
}

// Test production endpoint
function testProductionEndpoint() {
  console.log('\n🔍 Testing production endpoint...');
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'api.myl.zip',
    port: 443,
    path: '/api/v1/ssl/setup-wizard/provision',
    method: 'POST',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📡 Production Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 Production Response Body:', data);
      console.log('✅ Production test completed');
      
      // Test API key generation if SSL provisioning succeeded
      if (res.statusCode === 200) {
        console.log('\n🔑 Testing API key generation...');
        testApiKeyGeneration();
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Production test error:', e.message);
  });

  req.on('timeout', () => {
    console.error('⏰ Request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Test API key generation
function testApiKeyGeneration() {
  const apiKeyData = {
    deviceId: testData.deviceId,
    deviceName: testData.deviceName,
    userInitials: testData.userInitials
  };
  
  const postData = JSON.stringify(apiKeyData);
  
  const options = {
    hostname: 'api.myl.zip',
    port: 443,
    path: '/api/v1/ssl/setup-wizard/generate-key',
    method: 'POST',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📡 API Key Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 API Key Response Body:', data);
      console.log('✅ API key generation test completed');
      
      // Parse and display the API key if successful
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          if (response.success && response.data && response.data.apiKey) {
            console.log(`🔑 Generated API Key: ${response.data.apiKey.substring(0, 20)}...`);
          }
        } catch (e) {
          console.log('⚠️ Could not parse API key response');
        }
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ API key generation error:', e.message);
  });

  req.on('timeout', () => {
    console.error('⏰ API key request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Run tests
console.log('🚀 Starting complete flow tests...');
console.log('📋 Testing both SSL provisioning and API key generation...');
testLocalEndpoint();

// Wait a bit then test production
setTimeout(() => {
  testProductionEndpoint();
}, 2000);

