const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const {
  requireApiKey,
  requireRole,
  requirePermissions,
  logAuthEvent,
} = require('../middleware/auth');
const {
  apiKeyRateLimit,
  strictRateLimit,
} = require('../middleware/rateLimiter');

// All admin routes require API key authentication
router.use(requireApiKey);
router.use(requireRole('admin'));

// API Key Management
router.post('/keys/create',
  apiKeyRateLimit,
  requirePermissions(['api_keys:create']),
  logAuthEvent('api_key_create'),
  adminController.createApiKey,
);

router.get('/keys/list',
  apiKeyRateLimit,
  requirePermissions(['api_keys:read']),
  adminController.listApiKeys,
);

router.put('/keys/:id/update',
  apiKeyRateLimit,
  requirePermissions(['api_keys:update']),
  logAuthEvent('api_key_update'),
  adminController.updateApiKey,
);

router.delete('/keys/:id/revoke',
  apiKeyRateLimit,
  requirePermissions(['api_keys:delete']),
  logAuthEvent('api_key_revoke'),
  adminController.revokeApiKey,
);

// Client Management
router.post('/clients/create',
  apiKeyRateLimit,
  requirePermissions(['clients:create']),
  logAuthEvent('client_create'),
  adminController.createClient,
);

router.get('/clients/list',
  apiKeyRateLimit,
  requirePermissions(['clients:read']),
  adminController.listClients,
);

// System Statistics
router.get('/stats/system',
  apiKeyRateLimit,
  requirePermissions(['system:read']),
  adminController.getSystemStats,
);

// Audit Logs
router.get('/audit/logs',
  strictRateLimit,
  requirePermissions(['audit:read']),
  adminController.getAuditLogs,
);

module.exports = router;
