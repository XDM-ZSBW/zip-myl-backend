const https = require('https');

// Test data for API key generation
const apiKeyData = {
  deviceId: 'test123',
  deviceName: 'Test Device',
  userInitials: 'JD'
};

console.log('🔑 Testing API key generation endpoint...');

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
  console.log(`📡 API Key Response Headers:`, res.headers);
  
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

