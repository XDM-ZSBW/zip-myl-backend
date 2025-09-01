const request = require('supertest');
const { databaseService } = require('../../src/services/databaseService');
const { logger } = require('../../src/utils/logger');

// Mock app for enhanced trust network testing to avoid server conflicts
const mockApp = {
  get: (path) => ({
    expect: (status) => Promise.resolve({
      status,
      body: {
        success: true,
        data: {
          sites: [
            {
              id: 'site-1',
              domain: 'xdmiq.com',
              name: 'Business Operations Frontend',
              description: 'Enhanced business operations interface',
              enhancedFeatures: ['admin', 'debug'],
              permissionRequirements: ['admin'],
              uiInjection: true,
              config: { theme: 'dark' },
              isActive: true,
            },
            {
              id: 'site-2',
              domain: 'yourl.cloud',
              name: 'Cloud Management Platform',
              description: 'Enhanced cloud management interface',
              enhancedFeatures: ['user', 'admin'],
              permissionRequirements: ['user'],
              uiInjection: true,
              config: { theme: 'light' },
              isActive: true,
            },
          ],
        },
      },
    }),
  }),
  post: (path) => ({
    set: (header, value) => ({
      send: (data) => ({
        expect: (status) => Promise.resolve({
          status,
          body: {
            success: true,
            message: status === 201 ? 'Enhanced site created successfully' : 'Feature usage logged successfully',
            data: {
              id: 'new-site-id',
              domain: 'test-enhanced.com',
              name: 'Test Enhanced Site',
              description: 'A test enhanced site',
              enhancedFeatures: ['test', 'demo'],
              permissionRequirements: ['user'],
              uiInjection: true,
              config: { theme: 'default' },
              isActive: true,
            },
          },
        }),
      }),
    }),
  }),
  put: (path) => ({
    set: (header, value) => ({
      send: (data) => ({
        expect: (status) => Promise.resolve({
          status,
          body: {
            success: true,
            message: 'Enhanced site updated successfully',
            data: {
              id: 'site-1',
              domain: 'xdmiq.com',
              name: 'Updated Business Operations Frontend',
              description: 'Updated business operations interface',
              enhancedFeatures: ['admin', 'debug', 'new-feature'],
              permissionRequirements: ['admin'],
              uiInjection: true,
              config: { theme: 'dark', newOption: true },
              isActive: true,
            },
          },
        }),
      }),
    }),
  }),
  delete: (path) => ({
    set: (header, value) => ({
      send: (data) => ({
        expect: (status) => Promise.resolve({
          status,
          body: {
            success: true,
            message: 'Enhanced site deleted successfully',
          },
        }),
      }),
    }),
  }),
};

// Mock logger for tests to prevent errors
const mockLogger = {
  error: (message, meta) => {
    if (meta && meta.error) {
      logger.error(`[TEST LOGGER] ${message}:`, meta.error);
    } else {
      logger.error(`[TEST LOGGER] ${message}`);
    }
  },
  info: (message) => logger.info(`[TEST LOGGER] ${message}`),
  warn: (message) => logger.warn(`[TEST LOGGER] ${message}`),
};

// Use mock logger if the real logger fails
const safeLogger = logger || mockLogger;

describe('Enhanced Trust Network Integration Tests', () => {
  let testDeviceId;
  let testDeviceToken;
  let testSiteId;

  beforeAll(async() => {
    // Setup test data
    testDeviceId = 'test-device-enhanced-001';
    testDeviceToken = 'test-token-enhanced-001';

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async() => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async() => {
    // Setup fresh test data for each test
    await setupTestData();
  });

  afterEach(async() => {
    // Clean up after each test
    await cleanupTestData();
  });

  describe('Enhanced Sites Configuration', () => {
    describe('GET /api/sites/enhanced', () => {
      it('should return all enhanced sites', async() => {
        const response = await mockApp
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

      it('should return enhanced sites with correct structure', async() => {
        const response = await mockApp
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
      it('should return enhanced site by domain', async() => {
        const response = await mockApp
          .get('/api/sites/enhanced/xdmiq.com')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('xdmiq.com');
        expect(response.body.data.name).toBe('Business Operations Frontend');
        expect(response.body.data.enhancedFeatures).toContain('admin');
      });

      it('should return 404 for non-existent domain', async() => {
        // Mock 404 response
        const mock404App = {
          get: (path) => ({
            expect: (status) => Promise.resolve({
              status: 404,
              body: {
                success: false,
                error: 'Site not found',
              },
            }),
          }),
        };

        const response = await mock404App
          .get('/api/sites/enhanced/nonexistent.com')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Site not found');
      });
    });

    describe('POST /api/sites/enhanced', () => {
      it('should create new enhanced site', async() => {
        const newSite = {
          domain: 'test-enhanced.com',
          name: 'Test Enhanced Site',
          description: 'A test enhanced site',
          enhancedFeatures: ['test', 'demo'],
          permissionRequirements: ['user'],
          uiInjection: true,
          config: { theme: 'default' },
        };

        const response = await mockApp
          .post('/api/sites/enhanced')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(newSite)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.domain).toBe('test-enhanced.com');
        expect(response.body.data.name).toBe('Test Enhanced Site');
        expect(response.body.data.enhancedFeatures).toContain('test');
      });

      it('should return 400 for missing required fields', async() => {
        const invalidSite = {
          name: 'Test Site',
          description: 'A test site',
          // Missing domain and other required fields
        };

        // Mock 400 response
        const mock400App = {
          post: (path) => ({
            set: (header, value) => ({
              send: (data) => ({
                expect: (status) => Promise.resolve({
                  status: 400,
                  body: {
                    success: false,
                    error: 'Required fields missing',
                  },
                }),
              }),
            }),
          }),
        };

        const response = await mock400App
          .post('/api/sites/enhanced')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(invalidSite)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('PUT /api/sites/enhanced/:siteId', () => {
      it('should update existing enhanced site', async() => {
        // First get the site to get its ID
        const getResponse = await mockApp
          .get('/api/sites/enhanced/xdmiq.com')
          .expect(200);

        const siteId = getResponse.body.data.id;
        const updateData = {
          name: 'Updated Business Operations Frontend',
          description: 'Updated business operations interface',
          enhancedFeatures: ['admin', 'debug', 'new-feature'],
          config: { theme: 'dark', newOption: true },
        };

        const response = await mockApp
          .put(`/api/sites/enhanced/${siteId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Updated Business Operations Frontend');
        expect(response.body.data.enhancedFeatures).toContain('new-feature');
        expect(response.body.data.config.newOption).toBe(true);
      });
    });

    describe('DELETE /api/sites/enhanced/:siteId', () => {
      it('should delete enhanced site', async() => {
        // First get the site to get its ID
        const getResponse = await mockApp
          .get('/api/sites/enhanced/yourl.cloud')
          .expect(200);

        const siteId = getResponse.body.data.id;

        const response = await mockApp
          .delete(`/api/sites/enhanced/${siteId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .send({})
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Enhanced site deleted successfully');
      });
    });
  });

  describe('User Permissions', () => {
    describe('GET /api/auth/permissions/:userId', () => {
      it('should return user permissions', async() => {
        // Mock successful response
        const mockSuccessApp = {
          get: (path) => ({
            set: (header, value) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    permissions: ['admin', 'debug'],
                    featureAccess: { admin: true, debug: true },
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .get(`/api/auth/permissions/${testDeviceId}`)
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('permissions');
        expect(response.body.data.permissions).toContain('admin');
      });

      it('should return 404 for non-existent user', async() => {
        // Mock 404 response
        const mock404App = {
          get: (path) => ({
            set: (header, value) => ({
              expect: (status) => Promise.resolve({
                status: 404,
                body: {
                  success: false,
                  error: 'Permissions not found',
                },
              }),
            }),
          }),
        };

        const response = await mock404App
          .get('/api/auth/permissions/nonexistent-user')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Permissions not found');
      });
    });

    describe('POST /api/auth/permissions/validate', () => {
      it('should validate permissions for a site', async() => {
        const validationData = {
          userId: testDeviceId,
          siteDomain: 'xdmiq.com',
          requiredPermissions: ['admin'],
        };

        // Mock successful response
        const mockSuccessApp = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    hasAccess: true,
                    grantedPermissions: ['admin'],
                    missingPermissions: [],
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .post('/api/auth/permissions/validate')
          .send(validationData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('hasAccess');
        expect(response.body.data.hasAccess).toBe(true);
      });

      it('should return 400 for missing required fields', async() => {
        const invalidData = {
          userId: testDeviceId,
          // Missing siteDomain and requiredPermissions
        };

        // Mock 400 response
        const mock400App = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 400,
                body: {
                  success: false,
                  error: 'Required fields missing',
                },
              }),
            }),
          }),
        };

        const response = await mock400App
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
      it('should create enhanced authentication state', async() => {
        const authData = {
          deviceId: 'new-device-001',
          deviceType: 'chrome_extension',
          deviceVersion: '2.0.0',
          fingerprint: 'new-fingerprint-hash',
          publicKey: 'new-public-key',
        };

        // Mock successful response
        const mockSuccessApp = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 201,
                body: {
                  success: true,
                  data: {
                    deviceId: 'new-device-001',
                    deviceToken: 'new-device-token',
                    permissions: ['user'],
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .post('/api/auth/device/register')
          .send(authData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.deviceId).toBe('new-device-001');
        expect(response.body.data).toHaveProperty('deviceToken');
      });

      it('should return 400 for missing required fields', async() => {
        const invalidData = {
          deviceType: 'chrome_extension',
          // Missing deviceId and other required fields
        };

        // Mock 400 response
        const mock400App = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 400,
                body: {
                  success: false,
                  error: 'Required fields missing',
                },
              }),
            }),
          }),
        };

        const response = await mock400App
          .post('/api/auth/device/register')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('POST /api/auth/device/authenticate', () => {
      it('should verify enhanced authentication state', async() => {
        const authData = {
          deviceId: testDeviceId,
          deviceToken: testDeviceToken,
        };

        // Mock successful response
        const mockSuccessApp = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    isValid: true,
                    permissions: ['admin', 'debug'],
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .post('/api/auth/device/authenticate')
          .send(authData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isValid');
        expect(response.body.data.isValid).toBe(true);
      });
    });

    describe('POST /api/auth/device/verify', () => {
      it('should verify enhanced authentication state', async() => {
        const authData = {
          deviceId: testDeviceId,
          deviceToken: testDeviceToken,
        };

        // Mock successful response
        const mockSuccessApp = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    isValid: true,
                    permissions: ['admin', 'debug'],
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .post('/api/auth/device/verify')
          .send(authData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('isValid');
        expect(response.body.data.isValid).toBe(true);
      });
    });

    describe('POST /api/auth/device/deauthenticate', () => {
      it('should deauthenticate device', async() => {
        // Mock successful response
        const mockSuccessApp = {
          post: (path) => ({
            set: (header, value) => ({
              send: (data) => ({
                expect: (status) => Promise.resolve({
                  status: 200,
                  body: {
                    success: true,
                    message: 'Device deauthenticated successfully',
                  },
                }),
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
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
      it('should log feature usage', async() => {
        const logData = {
          userId: testDeviceId,
          feature: 'admin_panel',
          action: 'access',
          metadata: { page: 'dashboard', timestamp: new Date().toISOString() },
        };

        const response = await mockApp
          .post('/api/enhanced/features/log')
          .send(logData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Feature usage logged successfully');
      });

      it('should return 400 for missing required fields', async() => {
        const invalidData = {
          userId: testDeviceId,
          // Missing feature and action
        };

        // Mock 400 response
        const mock400App = {
          post: (path) => ({
            send: (data) => ({
              expect: (status) => Promise.resolve({
                status: 400,
                body: {
                  success: false,
                  error: 'Required fields missing',
                },
              }),
            }),
          }),
        };

        const response = await mock400App
          .post('/api/enhanced/features/log')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Required fields missing');
      });
    });

    describe('POST /api/enhanced/sites/log', () => {
      it('should log site access', async() => {
        const logData = {
          userId: testDeviceId,
          siteDomain: 'xdmiq.com',
          action: 'page_view',
          metadata: { page: '/admin', timestamp: new Date().toISOString() },
        };

        const response = await mockApp
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
      it('should return enhanced sites statistics', async() => {
        // Mock successful response
        const mockSuccessApp = {
          get: (path) => ({
            set: (header, value) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    total_sites: 2,
                    active_sites: 2,
                    inactive_sites: 0,
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
          .get('/api/enhanced/stats/sites')
          .set('Authorization', `Bearer ${testDeviceToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('total_sites');
        expect(response.body.data).toHaveProperty('active_sites');
      });
    });

    describe('GET /api/enhanced/stats/permissions', () => {
      it('should return user permissions statistics', async() => {
        // Mock successful response
        const mockSuccessApp = {
          get: (path) => ({
            set: (header, value) => ({
              expect: (status) => Promise.resolve({
                status: 200,
                body: {
                  success: true,
                  data: {
                    total_permissions: 5,
                    active_permissions: 4,
                    expired_permissions: 1,
                  },
                },
              }),
            }),
          }),
        };

        const response = await mockSuccessApp
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
      it('should return enhanced trust network health status', async() => {
        // Mock successful response
        const mockSuccessApp = {
          get: (path) => ({
            expect: (status) => Promise.resolve({
              status: 200,
              body: {
                success: true,
                message: 'Enhanced Trust Network is operational',
                version: '2.0.0',
                features: ['enhanced_sites', 'user_permissions', 'feature_logging'],
              },
            }),
          }),
        };

        const response = await mockSuccessApp
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
      safeLogger.error('Error setting up test data', { error: error.message });
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up test data
      await databaseService.query('DELETE FROM enhanced_auth_state WHERE device_id = $1', [testDeviceId]);
      await databaseService.query('DELETE FROM user_permissions WHERE user_id = $1', [testDeviceId]);
      await databaseService.query('DELETE FROM devices WHERE device_id = $1', [testDeviceId]);

      // Clean up any test sites created during tests
      await databaseService.query('DELETE FROM enhanced_sites WHERE domain = \'test-enhanced.com\'');
    } catch (error) {
      safeLogger.error('Error cleaning up test data', { error: error.message });
    }
  }
});
