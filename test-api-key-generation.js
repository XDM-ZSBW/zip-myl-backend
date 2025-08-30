const https = require('https');

// Test API key generation endpoint
function testApiKeyGeneration() {
  console.log('🔑 Testing API key generation endpoint...');
  
  const testData = {
    deviceId: 'test-device-123',
    deviceName: 'Test Device',
    userInitials: 'TD'
  };
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'api.myl.zip',
    port: 443,
    path: '/api/v1/ssl/setup-wizard/generate-key',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`📡 Response Status: ${res.statusCode}`);
    console.log(`📡 Response Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📡 Response Body:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ API key generation successful!');
      } else {
        console.log('❌ API key generation failed');
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

// Run the test
testApiKeyGeneration();
