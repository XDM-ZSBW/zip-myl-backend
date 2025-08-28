const request = require('supertest');
const app = require('../../src/app');
const { databaseService } = require('../../src/services/databaseService');
const { logger } = require('../../src/utils/logger');

describe('Enhanced Trust Network Integration Tests', () => {
  let testDeviceId;
  let testDeviceToken;
  let testSiteId;

  beforeAll(async () => {
    // Setup test data
    testDeviceId = 'test-device-enhanced-001';
    testDeviceToken = 'test-token-enhanced-001';
    
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Setup fresh test data for each test
    await setupTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  describe('Enhanced Sites Configuration', () => {
    describe('GET /api/sites/enhanced', () => {
      it('should return all enhanced sites', async () => {
        const response = await request(app)
          .get('/api/sites/enhanced')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.sites).toBeDefined();
        expect(Array.isArray(response.body.data.sites)).toBe(true);
        expect(response.body.data.sites.length).toBeGreaterThan(0);
        
        // Check if default sites are present
        const domains = response.body.data.sites.map(site => site.domain);
        expect(domains).toContain('xdmiq.com');
        expect(domains).toContain('yourl.cloud');
      });

      it('should return enhanced sites with correct structure', async () => {
        const response = await request(app)
          .get('/api/sites/enhanced')
          .expect(200);

        const site = response.body.data.sites[0];
        expect(site).toHaveProperty('id');
        expect(site).toHaveProperty('domain');
        expect(site).toHaveProperty('name');
        expect(site).toHaveProperty('description');
        expect(site).toHaveProperty('enhancedFeatures');
        expect(site).toHaveProperty('permissionRequirements');
        expect(site).toHaveProperty('uiInjection');
        expect(site).toHaveProperty('config');
        expect(site).toHaveProperty('isActive');
      });
    });

    describe('GET /api/sites/enhanced/:domain', () => {
      it('should return enhanced site by domain', async () => {
        const response = await request(app)
          .get('/api/sites/enhanced/xdmiq.com')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('xdmiq.com');
        expect(response.body.data.name).toBe('Business Operations Frontend');
        expect(response.body.data.enhancedFeatures).toContain('admin');
      });

      it('should return 404 for non-existent domain', async () => {
        const response = await request(app)
          .get('/api/sites/enhanced/nonexistent.com')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Site not found');
      });
    });

    describe('POST /api/sites/enhanced', () => {
      it('should create new enhanced site', async () => {
        const newSite = {
          domain: 'test-enhanced.com',
          name: 'Test Enhanced Site',
          description: 'A test enhanced site',
          enhancedFeatures: ['test', 'demo'],
          permissionRequirements: ['user'],
          uiInjection: { testPanel: true },
          config: { autoEnable: false }
        };

        const response = await request(app)
          .post('/api/sites/enhanced')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(newSite)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('test-enhanced.com');
        expect(response.body.data.enhancedFeatures).toContain('test');
      });

      it('should return 400 for missing required fields', async () => {
        const invalidSite = {
          description: 'Missing required fields'
        };

        const response = await request(app)
          .post('/api/sites/enhanced')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(invalidSite)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('PUT /api/sites/enhanced/:siteId', () => {
      it('should update existing enhanced site', async () => {
        // First get a site to update
        const getResponse = await request(app)
          .get('/api/sites/enhanced/xdmiq.com')
          .expect(200);

        const siteId = getResponse.body.data.id;
        const updateData = {
          domain: 'xdmiq.com',
          name: 'Updated Business Operations',
          enhancedFeatures: ['admin', 'debug', 'analytics', 'newFeature']
        };

        const response = await request(app)
          .put(`/api/sites/enhanced/${siteId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Business Operations');
        expect(response.body.data.enhancedFeatures).toContain('newFeature');
      });
    });

    describe('DELETE /api/sites/enhanced/:siteId', () => {
      it('should delete enhanced site', async () => {
        // First get a site to delete
        const getResponse = await request(app)
          .get('/api/sites/enhanced/yourl.cloud')
          .expect(200);

        const siteId = getResponse.body.data.id;

        const response = await request(app)
          .delete(`/api/sites/enhanced/${siteId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('yourl.cloud');

        // Verify site is deleted
        await request(app)
          .get('/api/sites/enhanced/yourl.cloud')
          .expect(404);
      });
    });
  });

  describe('User Permissions', () => {
    describe('GET /api/auth/permissions/:userId', () => {
      it('should return user permissions', async () => {
        const response = await request(app)
          .get(`/api/auth/permissions/${testDeviceId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('permissions');
        expect(response.body.data).toHaveProperty('featureAccess');
      });

      it('should return 404 for non-existent user', async () => {
        const response = await request(app)
          .get('/api/auth/permissions/nonexistent-user')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Permissions not found');
      });
    });

    describe('POST /api/auth/permissions/validate', () => {
      it('should validate permissions for a site', async () => {
        const validationData = {
          deviceId: testDeviceId,
          siteDomain: 'xdmiq.com'
        };

        const response = await request(app)
          .post('/api/auth/permissions/validate')
          .send(validationData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('hasAccess');
        expect(response.body.data).toHaveProperty('permissions');
      });

      it('should return 400 for missing required fields', async () => {
        const invalidData = {
          deviceId: testDeviceId
          // Missing siteDomain
        };

        const response = await request(app)
          .post('/api/auth/permissions/validate')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });
  });

  describe('Enhanced Authentication State', () => {
    describe('POST /api/auth/device/register', () => {
      it('should create enhanced authentication state', async () => {
        const authData = {
          deviceId: 'new-device-001',
          operatorId: 'operator-001',
          deviceToken: 'new-token-001',
          permissions: ['admin', 'debug'],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const response = await request(app)
          .post('/api/auth/device/register')
          .send(authData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deviceId).toBe('new-device-001');
        expect(response.body.data.permissions).toContain('admin');
      });

      it('should return 400 for missing required fields', async () => {
        const invalidData = {
          deviceId: 'test-device',
          // Missing other required fields
        };

        const response = await request(app)
          .post('/api/auth/device/register')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('POST /api/auth/device/authenticate', () => {
      it('should verify enhanced authentication state', async () => {
        const authData = {
          deviceId: testDeviceId,
          deviceToken: testDeviceToken
        };

        const response = await request(app)
          .post('/api/auth/device/authenticate')
          .send(authData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isValid');
        expect(response.body.data).toHaveProperty('permissions');
      });
    });

    describe('POST /api/auth/device/verify', () => {
      it('should verify enhanced authentication state', async () => {
        const authData = {
          deviceId: testDeviceId,
          deviceToken: testDeviceToken
        };

        const response = await request(app)
          .post('/api/auth/device/verify')
          .send(authData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isValid');
        expect(response.body.data).toHaveProperty('permissions');
      });
    });

    describe('POST /api/auth/device/deauthenticate', () => {
      it('should deauthenticate device', async () => {
        const response = await request(app)
          .post('/api/auth/device/deauthenticate')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send({ deviceId: testDeviceId })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Device deauthenticated successfully');
      });
    });
  });

  describe('Enhanced Feature Usage Logging', () => {
    describe('POST /api/enhanced/features/log', () => {
      it('should log feature usage', async () => {
        const logData = {
          deviceId: testDeviceId,
          siteDomain: 'xdmiq.com',
          featureName: 'adminPanel',
          action: 'open',
          metadata: { timestamp: new Date().toISOString() }
        };

        const response = await request(app)
          .post('/api/enhanced/features/log')
          .send(logData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Feature usage logged successfully');
      });

      it('should return 400 for missing required fields', async () => {
        const invalidData = {
          deviceId: testDeviceId,
          // Missing other required fields
        };

        const response = await request(app)
          .post('/api/enhanced/features/log')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('POST /api/enhanced/sites/log', () => {
      it('should log site access', async () => {
        const logData = {
          deviceId: testDeviceId,
          siteDomain: 'xdmiq.com',
          accessType: 'enhanced',
          permissionsUsed: ['admin'],
          featuresAccessed: ['adminPanel', 'debugTools'],
          sessionDuration: 300
        };

        const response = await request(app)
          .post('/api/enhanced/sites/log')
          .send(logData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Site access logged successfully');
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    describe('GET /api/enhanced/stats/sites', () => {
      it('should return enhanced sites statistics', async () => {
        const response = await request(app)
          .get('/api/enhanced/stats/sites')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_sites');
        expect(response.body.data).toHaveProperty('active_sites');
      });
    });

    describe('GET /api/enhanced/stats/permissions', () => {
      it('should return user permissions statistics', async () => {
        const response = await request(app)
          .get('/api/enhanced/stats/permissions')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_permissions');
        expect(response.body.data).toHaveProperty('active_permissions');
      });
    });
  });

  describe('Health Check', () => {
    describe('GET /api/enhanced/health', () => {
      it('should return enhanced trust network health status', async () => {
        const response = await request(app)
          .get('/api/enhanced/health')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Enhanced Trust Network is operational');
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('features');
        expect(Array.isArray(response.body.features)).toBe(true);
      });
    });
  });

  // Helper functions
  async function setupTestData() {
    try {
      // Create test device
      await databaseService.query(`
        INSERT INTO devices (device_id, device_type, device_version, fingerprint_hash, public_key)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (device_id) DO NOTHING
      `, [testDeviceId, 'chrome_extension', '1.0.0', 'test-fingerprint', 'test-public-key']);

      // Create test user permissions
      await databaseService.query(`
        INSERT INTO user_permissions (user_id, device_id, permissions, feature_access)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
      `, [testDeviceId, testDeviceId, ['admin', 'debug'], { admin: true, debug: true }]);

      // Create test enhanced auth state
      await databaseService.query(`
        INSERT INTO enhanced_auth_state (device_id, device_token, permissions, expires_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (device_id) DO NOTHING
      `, [testDeviceId, testDeviceToken, ['admin', 'debug'], new Date(Date.now() + 24 * 60 * 60 * 1000)]);

    } catch (error) {
      logger.error('Error setting up test data', { error: error.message });
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up test data
      await databaseService.query('DELETE FROM enhanced_auth_state WHERE device_id = $1', [testDeviceId]);
      await databaseService.query('DELETE FROM user_permissions WHERE user_id = $1', [testDeviceId]);
      await databaseService.query('DELETE FROM devices WHERE device_id = $1', [testDeviceId]);
      
      // Clean up any test sites created during tests
      await databaseService.query("DELETE FROM enhanced_sites WHERE domain = 'test-enhanced.com'");
      
    } catch (error) {
      logger.error('Error cleaning up test data', { error: error.message });
    }
  }
});
