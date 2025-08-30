// 🔐 Quick SSL Integration Test Script
// Run this script in Chrome DevTools to verify SSL integration before GitHub release

console.log('🔐 Starting Quick SSL Integration Test...');

// Test Configuration
const TEST_CONFIG = {
  apiBase: 'https://api.myl.zip/api/v1',
  apiKey: 'test-api-key-12345', // Replace with actual test API key
  testDeviceId: 'test-device-001',
  testOrganizationId: 'test-org-001',
  testDomain: 'test-device-001.myl.zip'
};

// SSL Manager Class (copy from extension)
class SSLManager {
  constructor() {
    this.apiBase = TEST_CONFIG.apiBase;
    this.apiKey = TEST_CONFIG.apiKey;
  }

  async provisionSSL(deviceId, domain, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}/ssl/provision-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          deviceId,
          domain,
          certificateType: options.certificateType || 'single',
          autoRenewal: options.autoRenewal !== false
        })
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSSLStatus(deviceId) {
    try {
      const response = await fetch(`${this.apiBase}/ssl/device-status/${deviceId}`, {
        headers: { 'X-API-Key': this.apiKey }
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async upgradeToEnterprise(organizationId, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}/ssl/upgrade-to-enterprise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          organizationId,
          customDomain: options.customDomain,
          ssoEnabled: options.ssoEnabled
        })
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async autoInstallWindows(deviceId, domain) {
    try {
      const response = await fetch(`${this.apiBase}/windows-ssl/auto-install`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          deviceId,
          domain,
          certificateType: 'single',
          autoRenewal: true
        })
      });
      return response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Test Runner
class QuickSSLTest {
  constructor() {
    this.sslManager = new SSLManager();
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🧪 Running Quick SSL Integration Tests...\n');
    
    await this.testAPIHealth();
    await this.testSSLProvisioning();
    await this.testSSLStatus();
    await this.testEnterpriseUpgrade();
    await this.testWindowsIntegration();
    await this.testErrorHandling();
    
    this.printResults();
  }

  async testAPIHealth() {
    console.log('1️⃣ Testing API Health...');
    try {
      const response = await fetch(`${TEST_CONFIG.apiBase}/ssl/health`, {
        headers: { 'X-API-Key': TEST_CONFIG.apiKey }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        this.addResult('API Health Check', true, 'API is healthy');
      } else {
        this.addResult('API Health Check', false, 'API health check failed');
      }
    } catch (error) {
      this.addResult('API Health Check', false, error.message);
    }
  }

  async testSSLProvisioning() {
    console.log('2️⃣ Testing SSL Certificate Provisioning...');
    const result = await this.sslManager.provisionSSL(
      TEST_CONFIG.testDeviceId,
      TEST_CONFIG.testDomain
    );
    
    if (result.success) {
      this.addResult('SSL Provisioning', true, 'Certificate provisioned successfully');
    } else {
      this.addResult('SSL Provisioning', false, result.error || 'Provisioning failed');
    }
  }

  async testSSLStatus() {
    console.log('3️⃣ Testing SSL Status Check...');
    const result = await this.sslManager.getSSLStatus(TEST_CONFIG.testDeviceId);
    
    if (result.success) {
      this.addResult('SSL Status Check', true, 'Status retrieved successfully');
    } else {
      this.addResult('SSL Status Check', false, result.error || 'Status check failed');
    }
  }

  async testEnterpriseUpgrade() {
    console.log('4️⃣ Testing Enterprise Upgrade...');
    const result = await this.sslManager.upgradeToEnterprise(
      TEST_CONFIG.testOrganizationId,
      { customDomain: 'test-org.myl.zip', ssoEnabled: true }
    );
    
    if (result.success) {
      this.addResult('Enterprise Upgrade', true, 'Upgrade successful');
    } else {
      this.addResult('Enterprise Upgrade', false, result.error || 'Upgrade failed');
    }
  }

  async testWindowsIntegration() {
    console.log('5️⃣ Testing Windows Integration...');
    const result = await this.sslManager.autoInstallWindows(
      TEST_CONFIG.testDeviceId,
      TEST_CONFIG.testDomain
    );
    
    if (result.success) {
      this.addResult('Windows Integration', true, 'Windows integration successful');
    } else {
      this.addResult('Windows Integration', false, result.error || 'Windows integration failed');
    }
  }

  async testErrorHandling() {
    console.log('6️⃣ Testing Error Handling...');
    
    // Test with invalid API key
    const invalidManager = new SSLManager();
    invalidManager.apiKey = 'invalid-key';
    
    const result = await invalidManager.getSSLStatus(TEST_CONFIG.testDeviceId);
    
    if (!result.success) {
      this.addResult('Error Handling', true, 'Error handling works correctly');
    } else {
      this.addResult('Error Handling', false, 'Error handling not working');
    }
  }

  addResult(testName, passed, message) {
    this.results.tests.push({ testName, passed, message });
    if (passed) {
      this.results.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📋 Total: ${this.results.tests.length}`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! Ready for GitHub release.');
    } else {
      console.log('\n⚠️ Some tests failed. Review issues before GitHub release.');
      console.log('\nFailed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => console.log(`- ${test.testName}: ${test.message}`));
    }
  }
}

// UI Component Test
function testUIComponents() {
  console.log('\n🎨 Testing UI Components...');
  
  const tests = [
    {
      name: 'Free Tier Card',
      selector: '.ssl-status-card.free-tier',
      required: true
    },
    {
      name: 'Enterprise Tier Card',
      selector: '.ssl-status-card.enterprise-tier',
      required: true
    },
    {
      name: 'Provision Button',
      selector: '#provision-free-ssl',
      required: true
    },
    {
      name: 'Enterprise Button',
      selector: '#upgrade-enterprise',
      required: true
    },
    {
      name: 'SSL Indicator',
      selector: '.myl-ssl-indicator',
      required: false
    }
  ];

  let uiPassed = 0;
  let uiFailed = 0;

  tests.forEach(test => {
    const element = document.querySelector(test.selector);
    if (element || !test.required) {
      console.log(`✅ ${test.name}: Found`);
      uiPassed++;
    } else {
      console.log(`❌ ${test.name}: Not found`);
      uiFailed++;
    }
  });

  console.log(`\n🎨 UI Test Results: ${uiPassed} passed, ${uiFailed} failed`);
  return uiFailed === 0;
}

// Run Tests
async function runQuickTest() {
  const testRunner = new QuickSSLTest();
  await testRunner.runAllTests();
  
  // Test UI components if on extension page
  if (window.location.href.includes('chrome-extension://')) {
    testUIComponents();
  }
  
  console.log('\n🔐 Quick SSL Test Complete!');
  console.log('📝 Review results above before committing to GitHub.');
}

// Auto-run if this script is executed
if (typeof window !== 'undefined') {
  // Wait a moment for page to load
  setTimeout(runQuickTest, 1000);
}

// Export for manual execution
window.runQuickSSLTest = runQuickTest;
console.log('🔐 Quick SSL Test script loaded. Run "runQuickSSLTest()" to start testing.');
