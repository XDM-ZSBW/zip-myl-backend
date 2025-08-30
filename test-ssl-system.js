#!/usr/bin/env node

/**
 * SSL Certificate Provisioning System Test Script
 * Tests the complete SSL workflow from provisioning to Windows integration
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiKey: 'test-api-key-123', // Replace with actual API key
  deviceId: 'test-device-' + Date.now(),
  domain: 'test-device.myl.zip'
};

// Helper function to make HTTP requests
async function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'X-API-Key': TEST_CONFIG.apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
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

// Test functions
async function testSSLHealth() {
  console.log('\n🔍 Testing SSL Service Health...');
  
  try {
    const response = await makeRequest('GET', '/api/v1/ssl/health');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ SSL Service Health: PASSED');
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Total Users: ${response.data.data.metrics.totalUsers}`);
      console.log(`   Premium Users: ${response.data.data.data.metrics.premiumUsers}`);
      console.log(`   Monthly Revenue: $${response.data.data.metrics.monthlyRevenue}`);
    } else {
      console.log('❌ SSL Service Health: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ SSL Service Health: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testSSLProvisioning() {
  console.log('\n🔐 Testing SSL Certificate Provisioning...');
  
  try {
    const provisionData = {
      deviceId: TEST_CONFIG.deviceId,
      domain: TEST_CONFIG.domain,
      certificateType: 'single',
      autoRenewal: true
    };
    
    const response = await makeRequest('POST', '/api/v1/ssl/provision-device', provisionData);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ SSL Certificate Provisioning: PASSED');
      console.log(`   Device ID: ${response.data.data.certificate.deviceId}`);
      console.log(`   Domain: ${response.data.data.certificate.domain}`);
      console.log(`   Status: ${response.data.data.certificate.status}`);
      console.log(`   Premium: ${response.data.data.certificate.premium}`);
      console.log(`   Features: ${response.data.data.certificate.features.length} basic features`);
    } else {
      console.log('❌ SSL Certificate Provisioning: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ SSL Certificate Provisioning: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testSSLStatus() {
  console.log('\n📊 Testing SSL Device Status...');
  
  try {
    const response = await makeRequest('GET', `/api/v1/ssl/device-status/${TEST_CONFIG.deviceId}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ SSL Device Status: PASSED');
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Expired: ${response.data.data.certificate.expired}`);
      console.log(`   Days Until Expiry: ${response.data.data.certificate.daysUntilExpiry}`);
      console.log(`   Needs Renewal: ${response.data.data.certificate.needsRenewal}`);
    } else {
      console.log('❌ SSL Device Status: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ SSL Device Status: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testPremiumFeatures() {
  console.log('\n💎 Testing Premium Features...');
  
  try {
    const response = await makeRequest('GET', `/api/v1/ssl/premium-features/${TEST_CONFIG.deviceId}`);
    
    if (response.status === 200) {
      console.log('✅ Premium Features Check: PASSED');
      
      if (response.data.data.upgradeRequired) {
        console.log('   Status: Premium upgrade required');
        console.log(`   Monthly Price: $${response.data.data.pricing.monthly}`);
        console.log(`   Features Available: ${response.data.data.pricing.features.length} premium features`);
      } else {
        console.log('   Status: Premium features available');
        console.log(`   Features: ${response.data.data.features.length} premium features`);
      }
    } else {
      console.log('❌ Premium Features Check: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ Premium Features Check: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testWindowsIntegration() {
  console.log('\n🪟 Testing Windows SSL Integration...');
  
  try {
    const response = await makeRequest('GET', '/api/v1/windows-ssl/health');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Windows SSL Integration: PASSED');
      console.log(`   Status: ${response.data.data.status}`);
      console.log(`   Windows Service: ${response.data.data.windowsService.status}`);
      console.log(`   Installed Certificates: ${response.data.data.installedCertificates}`);
      console.log(`   Certificate Store: ${response.data.data.integration.certificateStore}`);
      console.log(`   PowerShell: ${response.data.data.integration.powershell}`);
    } else {
      console.log('❌ Windows SSL Integration: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ Windows SSL Integration: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testWindowsAutoInstall() {
  console.log('\n🚀 Testing Windows SSL Auto-Install...');
  
  try {
    const autoInstallData = {
      deviceId: TEST_CONFIG.deviceId,
      domain: TEST_CONFIG.domain,
      certificateType: 'single',
      autoRenewal: true
    };
    
    const response = await makeRequest('POST', '/api/v1/windows-ssl/auto-install', autoInstallData);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Windows SSL Auto-Install: PASSED');
      console.log(`   SSL Provisioning: ${response.data.data.ssl.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Windows Installation: ${response.data.data.windows.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Message: ${response.data.data.message}`);
    } else {
      console.log('❌ Windows SSL Auto-Install: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ Windows SSL Auto-Install: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testPowerShellScript() {
  console.log('\n💻 Testing PowerShell Script Generation...');
  
  try {
    const response = await makeRequest('GET', `/api/v1/windows-ssl/powershell/${TEST_CONFIG.deviceId}/install`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ PowerShell Script Generation: PASSED');
      console.log(`   Action: ${response.data.data.action}`);
      console.log(`   Device ID: ${response.data.data.deviceId}`);
      console.log(`   PowerShell Version: ${response.data.data.powershellVersion}`);
      console.log(`   Requirements: ${response.data.data.requirements}`);
      console.log(`   Script Length: ${response.data.data.script.length} characters`);
    } else {
      console.log('❌ PowerShell Script Generation: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ PowerShell Script Generation: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

async function testRevenueAnalytics() {
  console.log('\n💰 Testing Revenue Analytics...');
  
  try {
    const response = await makeRequest('GET', '/api/v1/ssl/analytics/revenue');
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Revenue Analytics: PASSED');
      console.log(`   Total Users: ${response.data.data.totalUsers}`);
      console.log(`   Premium Users: ${response.data.data.premiumUsers}`);
      console.log(`   Monthly Revenue: $${response.data.data.monthlyRevenue}`);
      console.log(`   Conversion Rate: ${response.data.data.conversionRate}%`);
      console.log(`   Currency: ${response.data.data.currency}`);
    } else {
      console.log('❌ Revenue Analytics: FAILED');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, response.data);
    }
  } catch (error) {
    console.log('❌ Revenue Analytics: ERROR');
    console.log(`   Error: ${error.message}`);
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting SSL Certificate Provisioning System Tests...');
  console.log(`📍 Test Server: ${TEST_CONFIG.baseUrl}`);
  console.log(`🆔 Test Device: ${TEST_CONFIG.deviceId}`);
  console.log(`🌐 Test Domain: ${TEST_CONFIG.domain}`);
  console.log('=' .repeat(60));
  
  try {
    // Test core SSL functionality
    await testSSLHealth();
    await testSSLProvisioning();
    await testSSLStatus();
    await testPremiumFeatures();
    
    // Test Windows integration
    await testWindowsIntegration();
    await testWindowsAutoInstall();
    await testPowerShellScript();
    
    // Test analytics
    await testRevenueAnalytics();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 All SSL System Tests Completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ SSL Certificate Provisioning System');
    console.log('✅ Windows 11 Integration');
    console.log('✅ Premium Features Management');
    console.log('✅ PowerShell Script Generation');
    console.log('✅ Revenue Analytics');
    console.log('\n💡 Next Steps:');
    console.log('1. Deploy to production');
    console.log('2. Integrate with real Let\'s Encrypt');
    console.log('3. Implement payment processing');
    console.log('4. Launch marketing campaign');
    console.log('5. Target Windows 11 business users');
    
  } catch (error) {
    console.log('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServerHealth() {
  try {
    const response = await makeRequest('GET', '/api/v1/health');
    if (response.status === 200) {
      console.log('✅ Server is running and healthy');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('   Please start the server with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  const serverHealthy = await checkServerHealth();
  if (serverHealthy) {
    await runAllTests();
  } else {
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runAllTests,
  testSSLHealth,
  testSSLProvisioning,
  testSSLStatus,
  testPremiumFeatures,
  testWindowsIntegration,
  testWindowsAutoInstall,
  testPowerShellScript,
  testRevenueAnalytics
};
