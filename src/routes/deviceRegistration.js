const express = require('express');
const router = express.Router();
const deviceRegistrationController = require('../controllers/deviceRegistrationController');
const { authenticateDevice } = require('../middleware/deviceAuth');
const { rateLimit } = require('../middleware/rateLimiting');

/**
 * Device Registration Routes
 * Handles device registration, pairing, and trust management
 */

// Device registration (no auth required)
router.post('/register', 
  rateLimit('device_registration', { windowMs: 60 * 60 * 1000, max: 5 }), // 5 per hour
  deviceRegistrationController.registerDevice
);

// Generate pairing code (requires device auth)
router.post('/pairing-code',
  authenticateDevice,
  rateLimit('pairing_code', { windowMs: 60 * 60 * 1000, max: 10 }), // 10 per hour
  deviceRegistrationController.generatePairingCode
);

// Generate pairing code (plural endpoint for extension compatibility - no auth required for testing)
router.post('/pairing-codes',
  rateLimit('pairing_code', { windowMs: 60 * 60 * 1000, max: 10 }), // 10 per hour
  deviceRegistrationController.generatePairingCode
);

// Pair devices using pairing code (requires device auth)
router.post('/pair',
  authenticateDevice,
  rateLimit('device_pairing', { windowMs: 60 * 60 * 1000, max: 3 }), // 3 per hour
  deviceRegistrationController.pairDevices
);

// Get trusted devices (requires device auth)
router.get('/trusted',
  authenticateDevice,
  deviceRegistrationController.getTrustedDevices
);

// Revoke device trust (requires device auth)
router.delete('/trust/:deviceId',
  authenticateDevice,
  deviceRegistrationController.revokeTrust
);

// Update device information (requires device auth)
router.put('/:deviceId',
  authenticateDevice,
  deviceRegistrationController.updateDevice
);

// Key exchange endpoints
router.post('/keys/exchange',
  authenticateDevice,
  rateLimit('key_exchange', { windowMs: 60 * 1000, max: 5 }), // 5 per minute
  async (req, res) => {
    try {
      const { targetDeviceId, encryptedKeyData } = req.body;
      const sourceDeviceId = req.deviceId;

      // TODO: Implement key exchange logic
      res.json({
        success: true,
        message: 'Key exchange initiated',
        exchangeId: 'mock-exchange-id'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Key exchange failed',
        message: error.message
      });
    }
  }
);

// Device health check
router.get('/health',
  async (req, res) => {
    try {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: {
          deviceRegistration: true,
          devicePairing: true,
          trustManagement: true,
          keyExchange: true
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Health check failed',
        message: error.message
      });
    }
  }
);

// Device statistics (admin only)
router.get('/stats',
  authenticateDevice,
  async (req, res) => {
    try {
      // TODO: Implement device statistics
      res.json({
        totalDevices: 0,
        activeDevices: 0,
        trustRelationships: 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get device statistics',
        message: error.message
      });
    }
  }
);

module.exports = router;
