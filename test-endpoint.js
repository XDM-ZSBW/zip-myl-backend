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
    console.log(`📡 Local Response Headers:`, res.headers);
    
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

// Test production endpoint with retry
function testProductionEndpoint() {
  console.log('\n🔍 Testing production endpoint...');
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'api.myl.zip',
    port: 443,
    path: '/api/v1/ssl/setup-wizard/provision',
    method: 'POST',
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📡 Production Response Status: ${res.statusCode}`);
    console.log(`📡 Production Response Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 Production Response Body:', data);
      console.log('✅ Production test completed');
    });
  });

  req.on('error', (e) => {
    console.error('❌ Production test error:', e.message);
    if (e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET') {
      console.log('⏰ Service might be booting up, retrying in 10 seconds...');
      setTimeout(() => {
        console.log('🔄 Retrying production endpoint...');
        testProductionEndpoint();
      }, 10000);
    }
  });

  req.on('timeout', () => {
    console.error('⏰ Request timed out');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Run tests
console.log('🚀 Starting endpoint tests...');
testLocalEndpoint();

// Wait a bit then test production
setTimeout(() => {
  testProductionEndpoint();
}, 2000);
