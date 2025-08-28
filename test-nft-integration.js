const http = require('http');

// Test NFT integration with UUID pairing codes
async function testNFTIntegration() {
  console.log('🧪 Testing NFT Integration with UUID Pairing Codes...\n');
  
  // Test 1: Generate UUID pairing code with NFT
  console.log('1️⃣ Generating UUID pairing code with NFT...');
  const generateResponse = await makeRequest('/api/v1/device-registration/pairing-codes', 'POST', {
    deviceId: 'test-device-123',
    format: 'uuid'
  });
  
  if (generateResponse.success) {
    console.log('✅ UUID pairing code generated successfully');
    console.log(`   Pairing Code: ${generateResponse.pairingCode}`);
    console.log(`   Format: ${generateResponse.format}`);
    console.log(`   NFT ID: ${generateResponse.nft.id}`);
    console.log(`   NFT Shape: ${generateResponse.nft.shape.name}`);
    console.log(`   NFT Color: ${generateResponse.nft.color}`);
    
    const pairingCode = generateResponse.pairingCode;
    const nftId = generateResponse.nft.id;
    
    // Test 2: Retrieve NFT by pairing code
    console.log('\n2️⃣ Retrieving NFT by pairing code...');
    const nftByCodeResponse = await makeRequest(`/api/v1/nft/pairing-code/${pairingCode}`, 'GET');
    
    if (nftByCodeResponse.success) {
      console.log('✅ NFT retrieved by pairing code successfully');
      console.log(`   NFT ID: ${nftByCodeResponse.nft.id}`);
      console.log(`   Shape: ${nftByCodeResponse.nft.shape.name}`);
      console.log(`   Color: ${nftByCodeResponse.nft.color}`);
    } else {
      console.log('❌ Failed to retrieve NFT by pairing code');
    }
    
    // Test 3: Retrieve NFT by ID
    console.log('\n3️⃣ Retrieving NFT by ID...');
    const nftByIdResponse = await makeRequest(`/api/v1/nft/${nftId}`, 'GET');
    
    if (nftByIdResponse.success) {
      console.log('✅ NFT retrieved by ID successfully');
      console.log(`   NFT ID: ${nftByIdResponse.nft.id}`);
      console.log(`   Pairing Code: ${nftByIdResponse.nft.pairingCode}`);
      console.log(`   Device ID: ${nftByIdResponse.nft.deviceId}`);
    } else {
      console.log('❌ Failed to retrieve NFT by ID');
    }
    
    // Test 4: Verify NFT metadata
    console.log('\n4️⃣ Verifying NFT metadata...');
    if (generateResponse.nft.metadata.type === 'pairing-code-nft' && 
        generateResponse.nft.isPairingToken === true) {
      console.log('✅ NFT metadata verified successfully');
      console.log(`   Type: ${generateResponse.nft.metadata.type}`);
      console.log(`   Version: ${generateResponse.nft.metadata.version}`);
      console.log(`   Algorithm: ${generateResponse.nft.metadata.algorithm}`);
    } else {
      console.log('❌ NFT metadata verification failed');
    }
    
  } else {
    console.log('❌ Failed to generate UUID pairing code');
    console.log(`   Error: ${generateResponse.error}`);
  }
  
  console.log('\n🎉 NFT Integration Test Complete!');
}

// Helper function to make HTTP requests
function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the test
testNFTIntegration().catch(console.error);
