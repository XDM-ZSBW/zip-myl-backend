const https = require('https');
const http = require('http');

async function testDeviceRegistration() {
  // Use local development server instead of production
  const backendURL = 'http://localhost:3000';
  
  console.log('Testing device registration endpoint on local development server...');
  console.log(`Backend URL: ${backendURL}`);
  
  const postData = JSON.stringify({
    deviceInfo: {
      userAgent: 'Test Script',
      platform: 'Node.js',
      browser: 'Test Client'
    },
    userPreferences: {
      nickname: 'Test Device'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/device/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Device registration successful:', responseData);
          } else {
            console.log('❌ Device registration failed:', res.statusCode, responseData);
          }
          resolve(responseData);
        } catch (error) {
          console.log('❌ Error parsing response:', error.message);
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error testing device registration:', error.message);
      console.log('💡 Make sure the development server is running with: node start-dev.js');
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testDeviceRegistration();
