const http = require('http');

// Test data for API key generation
const apiKeyData = {
  deviceId: 'test123',
  deviceName: 'Test Device',
  userInitials: 'JD'
};

console.log('🔑 Testing local API key generation endpoint...');

const postData = JSON.stringify(apiKeyData);

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/ssl/setup-wizard/generate-key',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`📡 Local API Key Response Status: ${res.statusCode}`);
  console.log(`📡 Local API Key Response Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📡 Local API Key Response Body:', data);
    console.log('✅ Local API key generation test completed');
    
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
  console.error('❌ Local API key generation error:', e.message);
});

req.write(postData);
req.end();

