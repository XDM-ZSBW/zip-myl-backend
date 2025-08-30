const express = require('express');
const router = express.Router();
const sslService = require('../services/sslService');
const { validateApiKey } = require('../middleware/apiKeyValidation');
// Simple input validation function
const validateInput = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    // Check required fields
    if (schema.deviceId && schema.deviceId.required && !req.body.deviceId) {
      errors.push('deviceId is required');
    }
    
    if (schema.domain && schema.domain.required && !req.body.domain) {
      errors.push('domain is required');
    }
    
    // Check field types
    if (req.body.deviceId && schema.deviceId && schema.deviceId.minLength && req.body.deviceId.length < schema.deviceId.minLength) {
      errors.push(`deviceId must be at least ${schema.deviceId.minLength} characters`);
    }
    
    if (req.body.domain && schema.domain && schema.domain.minLength && req.body.domain.length < schema.domain.minLength) {
      errors.push(`domain must be at least ${schema.domain.minLength} characters`);
    }
    
    // Check enum values
    if (req.body.certificateType && schema.certificateType && schema.certificateType.enum && !schema.certificateType.enum.includes(req.body.certificateType)) {
      errors.push(`certificateType must be one of: ${schema.certificateType.enum.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return res.apiError('Validation failed', 400, errors.join('; '));
    }
    
    next();
  };
};
const logger = require('../utils/logger');

// Apply API key validation to all SSL routes
router.use(validateApiKey);

/**
 * @route POST /api/v1/ssl/provision-device
 * @desc Provision SSL certificate for a device
 * @access Private (API Key Required)
 */
router.post('/provision-device', 
  validateInput({
    deviceId: { type: 'string', required: true, minLength: 1 },
    domain: { type: 'string', required: true, minLength: 1 },
    certificateType: { type: 'string', required: false, enum: ['single', 'wildcard', 'multi'] },
    autoRenewal: { type: 'boolean', required: false }
  }),
  async (req, res) => {
    try {
      const { deviceId, domain, certificateType, autoRenewal } = req.body;
      
      logger.info('SSL certificate provisioning request', { deviceId, domain, certificateType, autoRenewal });
      
      const result = await sslService.provisionCertificate(deviceId, domain, {
        certificateType,
        autoRenewal
      });
      
      res.apiSuccess(result, 'SSL certificate provisioned successfully');
    } catch (error) {
      logger.error('SSL certificate provisioning failed', { error: error.message, body: req.body });
      res.apiError('Failed to provision SSL certificate', 500, error.message);
    }
  }
);

/**
 * @route GET /api/v1/ssl/device-status/:deviceId
 * @desc Get SSL status for a specific device
 * @access Private (API Key Required)
 */
router.get('/device-status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('SSL device status request', { deviceId });
    
    const result = await sslService.getDeviceStatus(deviceId);
    
    if (result.success) {
      res.apiSuccess(result, 'SSL device status retrieved successfully');
    } else {
      res.apiError(result.message, 404);
    }
  } catch (error) {
    logger.error('SSL device status retrieval failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to retrieve SSL device status', 500, error.message);
  }
});

/**
 * @route POST /api/v1/ssl/generate-extension-key
 * @desc Generate API key for Chrome extension with SSL-certified device
 * @access Private (Device Registration Required)
 */
router.post('/generate-extension-key', 
  validateInput({
    deviceId: { type: 'string', required: true, minLength: 1 },
    extensionName: { type: 'string', required: false, minLength: 1 },
    permissions: { type: 'array', required: false }
  }),
  async (req, res) => {
    try {
      const { deviceId, extensionName = 'Chrome Extension', permissions = ['ssl:read', 'device:read'] } = req.body;
      
      logger.info('Extension API key generation request', { deviceId, extensionName, permissions });
      
      // Verify device has SSL certificate
      const sslStatus = await sslService.getDeviceStatus(deviceId);
      if (!sslStatus.success || !sslStatus.certificate || sslStatus.certificate.expired) {
        return res.apiError('Device must have a valid SSL certificate to generate extension API key', 403);
      }
      
      // Generate extension-specific API key
      const result = await sslService.generateExtensionApiKey(deviceId, {
        extensionName,
        permissions,
        deviceId
      });
      
      res.apiSuccess(result, 'Extension API key generated successfully');
    } catch (error) {
      logger.error('Extension API key generation failed', { error: error.message, body: req.body });
      res.apiError('Failed to generate extension API key', 500, error.message);
    }
  }
);

/**
 * @route POST /api/v1/ssl/renew-certificate/:deviceId
 * @desc Renew SSL certificate for a device
 * @access Private (API Key Required)
 */
router.post('/renew-certificate/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('SSL certificate renewal request', { deviceId });
    
    const result = await sslService.renewCertificate(deviceId);
    
    res.apiSuccess(result, 'SSL certificate renewed successfully');
  } catch (error) {
    logger.error('SSL certificate renewal failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to renew SSL certificate', 500, error.message);
  }
});

/**
 * @route DELETE /api/v1/ssl/revoke-certificate/:deviceId
 * @desc Revoke SSL certificate for a device
 * @access Private (API Key Required)
 */
router.delete('/revoke-certificate/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('SSL certificate revocation request', { deviceId });
    
    const result = await sslService.revokeCertificate(deviceId);
    
    res.apiSuccess(result, 'SSL certificate revoked successfully');
  } catch (error) {
    logger.error('SSL certificate revocation failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to revoke SSL certificate', 500, error.message);
  }
});

/**
 * @route GET /api/v1/ssl/premium-features/:deviceId
 * @desc Get premium SSL features for a device
 * @access Private (API Key Required)
 */
router.get('/premium-features/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('Premium SSL features request', { deviceId });
    
    const result = await sslService.getPremiumFeatures(deviceId);
    
    if (result.success) {
      res.apiSuccess(result, 'Premium SSL features retrieved successfully');
    } else {
      res.apiSuccess(result, 'Premium features information retrieved');
    }
  } catch (error) {
    logger.error('Premium SSL features retrieval failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to retrieve premium SSL features', 500, error.message);
  }
});

/**
 * @route POST /api/v1/ssl/upgrade-to-premium
 * @desc Upgrade device to premium SSL
 * @access Private (API Key Required)
 */
router.post('/upgrade-to-premium',
  validateInput({
    deviceId: { type: 'string', required: true, minLength: 1 }
  }),
  async (req, res) => {
    try {
      const { deviceId } = req.body;
      
      logger.info('SSL premium upgrade request', { deviceId });
      
      const result = await sslService.upgradeToPremium(deviceId);
      
      if (result.success) {
        res.apiSuccess(result, 'Successfully upgraded to premium SSL');
      } else {
        res.apiError(result.message, 400);
      }
    } catch (error) {
      logger.error('SSL premium upgrade failed', { error: error.message, body: req.body });
      res.apiError('Failed to upgrade to premium SSL', 500, error.message);
    }
  }
);

/**
 * @route GET /api/v1/ssl/advanced-management/:deviceId
 * @desc Get advanced SSL management features for a device
 * @access Private (API Key Required)
 */
router.get('/advanced-management/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('Advanced SSL management request', { deviceId });
    
    const result = await sslService.getAdvancedManagement(deviceId);
    
    res.apiSuccess(result, 'Advanced SSL management features retrieved successfully');
  } catch (error) {
    logger.error('Advanced SSL management retrieval failed', { deviceId: req.params.deviceId, error: error.message });
    
    if (error.message.includes('Premium subscription required')) {
      res.apiError('Premium subscription required for advanced management', 403, error.message);
    } else {
      res.apiError('Failed to retrieve advanced SSL management', 500, error.message);
    }
  }
});

/**
 * @route GET /api/v1/ssl/analytics/revenue
 * @desc Get SSL revenue analytics (admin function)
 * @access Private (API Key Required)
 */
router.get('/analytics/revenue', async (req, res) => {
  try {
    logger.info('SSL revenue analytics request');
    
    const metrics = await sslService.getRevenueMetrics();
    
    res.apiSuccess(metrics, 'SSL revenue analytics retrieved successfully');
  } catch (error) {
    logger.error('SSL revenue analytics retrieval failed', { error: error.message });
    res.apiError('Failed to retrieve SSL revenue analytics', 500, error.message);
  }
});

/**
 * @route GET /api/v1/ssl/analytics/certificates
 * @desc Get all SSL certificates (admin function)
 * @access Private (API Key Required)
 */
router.get('/analytics/certificates', async (req, res) => {
  try {
    logger.info('SSL certificates analytics request');
    
    const certificates = await sslService.getAllCertificates();
    const premiumCount = await sslService.getPremiumUsersCount();
    
    const analytics = {
      totalCertificates: certificates.length,
      premiumUsers: premiumCount,
      certificates: certificates.map(cert => ({
        id: cert.id,
        deviceId: cert.deviceId,
        domain: cert.domain,
        status: cert.status,
        premium: cert.premium,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt
      }))
    };
    
    res.apiSuccess(analytics, 'SSL certificates analytics retrieved successfully');
  } catch (error) {
    logger.error('SSL certificates analytics retrieval failed', { error: error.message });
    res.apiError('Failed to retrieve SSL certificates analytics', 500, error.message);
  }
});

/**
 * @route GET /api/v1/ssl/health
 * @desc Get SSL service health status
 * @access Private (API Key Required)
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = await sslService.getRevenueMetrics();
    
    const health = {
      status: 'healthy',
      service: 'SSL Certificate Service',
      timestamp: new Date().toISOString(),
      metrics: {
        totalUsers: metrics.totalUsers,
        premiumUsers: metrics.premiumUsers,
        monthlyRevenue: metrics.monthlyRevenue,
        conversionRate: metrics.conversionRate
      },
      features: {
        basic: sslService.getBasicFeatures(),
        premium: sslService.getPremiumFeaturesList()
      }
    };
    
    res.apiSuccess(health, 'SSL service is healthy');
  } catch (error) {
    logger.error('SSL health check failed', { error: error.message });
    res.apiError('SSL service health check failed', 500, error.message);
  }
});

module.exports = router;
