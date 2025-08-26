const https = require('https');
const http = require('http');

// Test the pairing codes endpoint
const testData = {
  deviceId: 'test-device-123',
  format: 'uuid',
  expiresIn: 300
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/v1/device-registration/pairing-codes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing UUID format...');
const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const response = JSON.parse(data);
      console.log('✅ UUID Format Test:', response.success ? 'PASSED' : 'FAILED');
      console.log('Generated Code:', response.pairingCode);
      console.log('Format:', response.format);
    } catch (e) {
      console.log('❌ Failed to parse response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request failed: ${e.message}`);
});

req.write(postData);
req.end();

// Test short format
setTimeout(() => {
  console.log('\nTesting SHORT format...');
  const shortTestData = {
    deviceId: 'test-device-456',
    format: 'short',
    expiresIn: 300
  };
  
  const shortPostData = JSON.stringify(shortTestData);
  const shortReq = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      try {
        const response = JSON.parse(data);
        console.log('✅ SHORT Format Test:', response.success ? 'PASSED' : 'FAILED');
        console.log('Generated Code:', response.pairingCode);
        console.log('Format:', response.format);
      } catch (e) {
        console.log('❌ Failed to parse response:', e.message);
      }
    });
  });
  
  shortReq.on('error', (e) => {
    console.error(`❌ Request failed: ${e.message}`);
  });
  
  shortReq.write(shortPostData);
  shortReq.end();
}, 1000);
