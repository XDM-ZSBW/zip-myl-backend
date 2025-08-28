const express = require('express');
const { authenticateDevice } = require('../middleware/deviceAuth');
const { validate, schemas } = require('../middleware/validation');
const { generalRateLimit } = require('../middleware/rateLimiter');
const { auditLog } = require('../middleware/auditLogger');

const router = express.Router();

// NFT API Routes
// All routes require device authentication and are rate limited

// Generate NFT pairing token
router.post('/generate-pairing', 
  authenticateDevice,
  generalRateLimit, // 10 requests per 15 minutes
  validate(schemas.nftGeneratePairing),
  auditLog('nft.generate_pairing'),
  async (req, res) => {
    try {
      const { platform, collectionName } = req.body;
      const userId = req.device.device_id;
      
      // Import NFT service
      const { NFTService } = require('../services/nftService');
      const nftService = new NFTService();
      
      const result = await nftService.generatePairingToken(userId, platform, collectionName);
      
      res.json({
        success: true,
        data: result,
        message: 'Pairing token generated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to generate pairing token'
      });
    }
  }
);

// Validate NFT pairing
router.post('/validate-pairing',
  authenticateDevice,
  generalRateLimit, // 20 requests per 15 minutes
  validate(schemas.nftValidatePairing),
  auditLog('nft.validate_pairing'),
  async (req, res) => {
    try {
      const { token, nftData } = req.body;
      const userId = req.device.device_id;
      
      // Import pairing service
      const { PairingService } = require('../services/pairingService');
      const pairingService = new PairingService();
      
      const result = await pairingService.validatePairing(token, nftData, userId);
      
      res.json({
        success: true,
        data: result,
        message: 'NFT pairing validated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to validate NFT pairing'
      });
    }
  }
);

// Get user's NFT profile collection
router.get('/profile-collection',
  authenticateDevice,
  generalRateLimit, // 30 requests per 5 minutes
  validate(schemas.nftProfileCollection, 'query'),
  auditLog('nft.get_profile_collection'),
  async (req, res) => {
    try {
      const { page, limit, platform } = req.query;
      const userId = req.device.device_id;
      
      // Import NFT service
      const { NFTService } = require('../services/nftService');
      const nftService = new NFTService();
      
      const result = await nftService.getProfileCollection(userId, { page, limit, platform });
      
      res.json({
        success: true,
        data: result,
        message: 'Profile collection retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to retrieve profile collection'
      });
    }
  }
);

// Store invalid NFT
router.post('/store-invalid',
  authenticateDevice,
  generalRateLimit, // 50 requests per 15 minutes
  validate(schemas.nftStoreInvalid),
  auditLog('nft.store_invalid'),
  async (req, res) => {
    try {
      const { nftData, reason, platform } = req.body;
      const userId = req.device.device_id;
      
      // Import NFT service
      const { NFTService } = require('../services/nftService');
      const nftService = new NFTService();
      
      const result = await nftService.storeInvalidNFT(nftData, reason, platform, userId);
      
      res.json({
        success: true,
        data: result,
        message: 'Invalid NFT stored successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to store invalid NFT'
      });
    }
  }
);

// Update user's profile picture
router.put('/profile-picture',
  authenticateDevice,
  generalRateLimit, // 10 requests per 15 minutes
  validate(schemas.nftProfilePicture),
  auditLog('nft.update_profile_picture'),
  async (req, res) => {
    try {
      const { imageData, imageFormat } = req.body;
      const userId = req.device.device_id;
      
      // Import NFT service
      const { NFTService } = require('../services/nftService');
      const nftService = new NFTService();
      
      const result = await nftService.updateProfilePicture(userId, imageData, imageFormat);
      
      res.json({
        success: true,
        data: result,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to update profile picture'
      });
    }
  }
);

// Get NFT statistics for user
router.get('/stats',
  authenticateDevice,
  generalRateLimit, // 20 requests per 5 minutes
  auditLog('nft.get_stats'),
  async (req, res) => {
    try {
      const userId = req.device.device_id;
      
      // Import NFT service
      const { NFTService } = require('../services/nftService');
      const nftService = new NFTService();
      
      const result = await nftService.getUserStats(userId);
      
      res.json({
        success: true,
        data: result,
        message: 'NFT statistics retrieved successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to retrieve NFT statistics'
      });
    }
  }
);

module.exports = router;
