const https = require('https');

// Test CORS for setup-wizard endpoints
const testCORS = async (endpoint) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.myl.zip',
      port: 443,
      path: endpoint,
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://myl.zip',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      }
    };

    const req = https.request(options, (res) => {
      console.log(`✅ ${endpoint} - Status: ${res.statusCode}`);
      console.log(`   Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
      console.log(`   Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
      console.log(`   Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
      
      if (res.statusCode === 200 && res.headers['access-control-allow-origin']) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error(`❌ ${endpoint} - Error: ${error.message}`);
      reject(error);
    });

    req.end();
  });
};

// Test both setup-wizard endpoints
const testSetupWizardCORS = async () => {
  console.log('🔧 Testing CORS for setup-wizard endpoints...\n');
  
  try {
    const provisionResult = await testCORS('/api/v1/ssl/setup-wizard/provision');
    const generateKeyResult = await testCORS('/api/v1/ssl/setup-wizard/generate-key');
    
    console.log('\n📊 Test Results:');
    console.log(`   Provision endpoint: ${provisionResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Generate key endpoint: ${generateKeyResult ? '✅ PASS' : '❌ FAIL'}`);
    
    if (provisionResult && generateKeyResult) {
      console.log('\n🎉 CORS fix successful! Setup wizard should now work from myl.zip');
    } else {
      console.log('\n⚠️  Some endpoints still have CORS issues');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testSetupWizardCORS();
