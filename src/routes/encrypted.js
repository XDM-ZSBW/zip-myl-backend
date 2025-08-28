const express = require('express');
const router = express.Router();
const encryptedThoughtsController = require('../controllers/encryptedThoughtsController');
const deviceTrustController = require('../controllers/deviceTrustController');

/**
 * Encrypted Thoughts Routes
 * All routes require device trust verification
 */

// Encrypted thoughts CRUD operations
router.post('/thoughts', encryptedThoughtsController.storeEncryptedThought);
router.get('/thoughts/:thoughtId', encryptedThoughtsController.getEncryptedThought);
router.get('/thoughts', encryptedThoughtsController.listEncryptedThoughts);
router.put('/thoughts/:thoughtId', encryptedThoughtsController.updateEncryptedThought);
router.delete('/thoughts/:thoughtId', encryptedThoughtsController.deleteEncryptedThought);

// Device trust management
router.post('/devices/register', deviceTrustController.registerDevice);
router.post('/devices/trust', deviceTrustController.trustDevice);
router.post('/devices/revoke-trust', deviceTrustController.revokeTrust);
router.get('/devices/trusted/:userId', deviceTrustController.getTrustedDevices);
router.get('/devices/trust/:deviceId', deviceTrustController.checkDeviceTrust);

// Device pairing - ADDING MISSING ENDPOINT
router.post('/devices/pairing-code', deviceTrustController.generatePairingCode);
router.post('/devices/pairing/generate', deviceTrustController.generatePairingCode);
router.post('/devices/pairing/verify', deviceTrustController.verifyPairingCode);

// Cross-device sharing
router.post('/share', deviceTrustController.shareThought);
router.get('/shared/:deviceId', deviceTrustController.getSharedThoughts);

module.exports = router;
