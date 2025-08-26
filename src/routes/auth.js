const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { 
  authenticateDevice, 
  authenticateDeviceOptional,
  logAuthEvent 
} = require('../middleware/auth');
const { 
  authRateLimit, 
  deviceRegistrationRateLimit 
} = require('../middleware/rateLimiter');

// Device registration endpoint
router.post('/device/register', 
  deviceRegistrationRateLimit,
  logAuthEvent('device_register'),
  authController.registerDevice
);

// Login endpoint (refresh tokens)
router.post('/login', 
  authRateLimit,
  logAuthEvent('login'),
  authController.login
);

// Refresh token endpoint
router.post('/refresh', 
  authRateLimit,
  logAuthEvent('token_refresh'),
  authController.refreshToken
);

// Logout endpoint
router.post('/logout', 
  authenticateDevice,
  logAuthEvent('logout'),
  authController.logout
);

// Validate token endpoint
router.post('/validate', 
  authRateLimit,
  logAuthEvent('token_validate'),
  authController.validateToken
);

// Device management endpoints
router.get('/device/info', 
  authenticateDevice,
  authController.getDeviceInfo
);

router.put('/device/update', 
  authenticateDevice,
  authController.updateDevice
);

router.delete('/device/revoke', 
  authenticateDevice,
  logAuthEvent('device_revoke'),
  authController.revokeDevice
);

// Session management endpoints
router.get('/device/sessions', 
  authenticateDevice,
  authController.getDeviceSessions
);

router.get('/sessions/stats', 
  authenticateDevice,
  authController.getSessionStats
);

module.exports = router;
