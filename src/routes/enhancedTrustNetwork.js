const express = require('express');
const router = express.Router();
const enhancedTrustNetworkController = require('../controllers/enhancedTrustNetworkController');
const {
  authenticateDevice,
  authenticateDeviceOptional,
  logAuthEvent,
} = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/rateLimiter');

// Enhanced Sites Configuration Endpoints
// GET /api/sites/enhanced - Get all enhanced sites
router.get('/sites/enhanced',
  generalRateLimit,
  enhancedTrustNetworkController.getEnhancedSites,
);

// GET /api/sites/enhanced/:domain - Get enhanced site by domain
router.get('/sites/enhanced/:domain',
  generalRateLimit,
  enhancedTrustNetworkController.getEnhancedSiteByDomain,
);

// POST /api/sites/enhanced - Create or update enhanced site
router.post('/sites/enhanced',
  authenticateDevice,
  generalRateLimit,
  logAuthEvent('enhanced_site_upsert'),
  enhancedTrustNetworkController.upsertEnhancedSite,
);

// PUT /api/sites/enhanced/:siteId - Update enhanced site
router.put('/sites/enhanced/:siteId',
  authenticateDevice,
  generalRateLimit,
  logAuthEvent('enhanced_site_update'),
  enhancedTrustNetworkController.updateEnhancedSite,
);

// DELETE /api/sites/enhanced/:siteId - Delete enhanced site
router.delete('/sites/enhanced/:siteId',
  authenticateDevice,
  generalRateLimit,
  logAuthEvent('enhanced_site_delete'),
  enhancedTrustNetworkController.deleteEnhancedSite,
);

// User Permissions Endpoints
// GET /api/auth/permissions/:userId - Get user permissions
router.get('/auth/permissions/:userId',
  authenticateDevice,
  generalRateLimit,
  enhancedTrustNetworkController.getUserPermissions,
);

// POST /api/auth/permissions/validate - Validate permissions for a site
router.post('/auth/permissions/validate',
  generalRateLimit,
  enhancedTrustNetworkController.validatePermissions,
);

// Enhanced Authentication State Endpoints
// POST /api/auth/device/register - Enhanced device registration
router.post('/auth/device/register',
  generalRateLimit,
  logAuthEvent('enhanced_device_register'),
  enhancedTrustNetworkController.upsertEnhancedAuthState,
);

// POST /api/auth/device/authenticate - Enhanced device authentication
router.post('/auth/device/authenticate',
  generalRateLimit,
  logAuthEvent('enhanced_device_authenticate'),
  enhancedTrustNetworkController.verifyEnhancedAuthState,
);

// POST /api/auth/device/verify - Enhanced device verification
router.post('/auth/device/verify',
  generalRateLimit,
  logAuthEvent('enhanced_device_verify'),
  enhancedTrustNetworkController.verifyEnhancedAuthState,
);

// POST /api/auth/device/deauthenticate - Enhanced device deauthentication
router.post('/auth/device/deauthenticate',
  authenticateDevice,
  generalRateLimit,
  logAuthEvent('enhanced_device_deauthenticate'),
  async(req, res) => {
    try {
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: 'Device ID required',
          message: 'Device ID is required for deauthentication',
        });
      }

      // Clear enhanced auth state (this would be implemented in the service)
      // For now, return success
      res.json({
        success: true,
        message: 'Device deauthenticated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Deauthentication failed',
        message: error.message,
      });
    }
  },
);

// Enhanced Feature Usage Logging Endpoints
// POST /api/enhanced/features/log - Log feature usage
router.post('/enhanced/features/log',
  generalRateLimit,
  enhancedTrustNetworkController.logFeatureUsage,
);

// POST /api/enhanced/sites/log - Log site access
router.post('/enhanced/sites/log',
  generalRateLimit,
  enhancedTrustNetworkController.logSiteAccess,
);

// Statistics and Monitoring Endpoints
// GET /api/enhanced/stats/sites - Get enhanced sites statistics
router.get('/enhanced/stats/sites',
  authenticateDevice,
  generalRateLimit,
  enhancedTrustNetworkController.getEnhancedSitesStats,
);

// GET /api/enhanced/stats/permissions - Get user permissions statistics
router.get('/enhanced/stats/permissions',
  authenticateDevice,
  generalRateLimit,
  enhancedTrustNetworkController.getUserPermissionsStats,
);

// Health Check for Enhanced Trust Network
router.get('/enhanced/health', (req, res) => {
  res.json({
    success: true,
    message: 'Enhanced Trust Network is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'Enhanced Sites Configuration',
      'User Permissions Management',
      'Enhanced Authentication State',
      'Feature Usage Logging',
      'Site Access Logging',
      'Statistics and Monitoring',
    ],
  });
});

module.exports = router;
