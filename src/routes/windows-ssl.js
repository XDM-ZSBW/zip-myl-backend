const express = require('express');
const router = express.Router();
const sslService = require('../services/sslService');
const windowsSSLService = require('../services/windowsSSLIntegrationService');
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

// Apply API key validation to all Windows SSL routes
router.use(validateApiKey);

/**
 * @route POST /api/v1/windows-ssl/install/:deviceId
 * @desc Install SSL certificate on Windows 11
 * @access Private (API Key Required)
 */
router.post('/install/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('Windows SSL certificate installation request', { deviceId });
    
    // Get SSL certificate for device
    const sslStatus = await sslService.getDeviceStatus(deviceId);
    
    if (!sslStatus.success) {
      return res.apiError('No SSL certificate found for device', 404);
    }

    // Install certificate on Windows
    const installationResult = await windowsSSLService.installCertificate(deviceId, sslStatus.certificate);
    
    res.apiSuccess(installationResult, 'SSL certificate installed successfully on Windows 11');
  } catch (error) {
    logger.error('Windows SSL certificate installation failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to install SSL certificate on Windows 11', 500, error.message);
  }
});

/**
 * @route DELETE /api/v1/windows-ssl/remove/:deviceId
 * @desc Remove SSL certificate from Windows 11
 * @access Private (API Key Required)
 */
router.delete('/remove/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('Windows SSL certificate removal request', { deviceId });
    
    const removalResult = await windowsSSLService.removeCertificate(deviceId);
    
    res.apiSuccess(removalResult, 'SSL certificate removed successfully from Windows 11');
  } catch (error) {
    logger.error('Windows SSL certificate removal failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to remove SSL certificate from Windows 11', 500, error.message);
  }
});

/**
 * @route GET /api/v1/windows-ssl/status/:deviceId
 * @desc Get Windows SSL certificate status
 * @access Private (API Key Required)
 */
router.get('/status/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    logger.info('Windows SSL certificate status request', { deviceId });
    
    // Get both SSL and Windows status
    const [sslStatus, windowsStatus] = await Promise.all([
      sslService.getDeviceStatus(deviceId),
      windowsSSLService.getInstalledCertificates()
    ]);
    
    const windowsCert = windowsStatus.find(cert => cert.deviceId === deviceId);
    
    const status = {
      deviceId,
      ssl: sslStatus.success ? sslStatus.certificate : null,
      windows: windowsCert || null,
      installed: !!windowsCert,
      overallStatus: windowsCert ? 'installed' : 'not_installed'
    };
    
    res.apiSuccess(status, 'Windows SSL certificate status retrieved successfully');
  } catch (error) {
    logger.error('Windows SSL certificate status retrieval failed', { deviceId: req.params.deviceId, error: error.message });
    res.apiError('Failed to retrieve Windows SSL certificate status', 500, error.message);
  }
});

/**
 * @route GET /api/v1/windows-ssl/service/status
 * @desc Get Windows SSL service status
 * @access Private (API Key Required)
 */
router.get('/service/status', async (req, res) => {
  try {
    logger.info('Windows SSL service status request');
    
    const serviceStatus = await windowsSSLService.getServiceStatus();
    
    res.apiSuccess(serviceStatus, 'Windows SSL service status retrieved successfully');
  } catch (error) {
    logger.error('Windows SSL service status retrieval failed', { error: error.message });
    res.apiError('Failed to retrieve Windows SSL service status', 500, error.message);
  }
});

/**
 * @route POST /api/v1/windows-ssl/service/start
 * @desc Start Windows SSL service
 * @access Private (API Key Required)
 */
router.post('/service/start', async (req, res) => {
  try {
    logger.info('Windows SSL service start request');
    
    const result = await windowsSSLService.startService();
    
    res.apiSuccess(result, 'Windows SSL service started successfully');
  } catch (error) {
    logger.error('Windows SSL service start failed', { error: error.message });
    res.apiError('Failed to start Windows SSL service', 500, error.message);
  }
});

/**
 * @route POST /api/v1/windows-ssl/service/stop
 * @desc Stop Windows SSL service
 * @access Private (API Key Required)
 */
router.post('/service/stop', async (req, res) => {
  try {
    logger.info('Windows SSL service stop request');
    
    const result = await windowsSSLService.stopService();
    
    res.apiSuccess(result, 'Windows SSL service stopped successfully');
  } catch (error) {
    logger.error('Windows SSL service stop failed', { error: error.message });
    res.apiError('Failed to stop Windows SSL service', 500, error.message);
  }
});

/**
 * @route GET /api/v1/windows-ssl/certificates
 * @desc Get all Windows-installed SSL certificates
 * @access Private (API Key Required)
 */
router.get('/certificates', async (req, res) => {
  try {
    logger.info('Windows SSL certificates list request');
    
    const certificates = await windowsSSLService.getInstalledCertificates();
    
    res.apiSuccess(certificates, 'Windows SSL certificates list retrieved successfully');
  } catch (error) {
    logger.error('Windows SSL certificates list retrieval failed', { error: error.message });
    res.apiError('Failed to retrieve Windows SSL certificates list', 500, error.message);
  }
});

/**
 * @route GET /api/v1/windows-ssl/powershell/:deviceId/:action
 * @desc Generate PowerShell script for SSL management
 * @access Private (API Key Required)
 */
router.get('/powershell/:deviceId/:action', async (req, res) => {
  try {
    const { deviceId, action } = req.params;
    
    logger.info('Windows SSL PowerShell script generation request', { deviceId, action });
    
    const script = await windowsSSLService.generatePowerShellScript(deviceId, action);
    
    res.apiSuccess(script, 'PowerShell script generated successfully');
  } catch (error) {
    logger.error('Windows SSL PowerShell script generation failed', { deviceId: req.params.deviceId, action: req.params.action, error: error.message });
    res.apiError('Failed to generate PowerShell script', 500, error.message);
  }
});

/**
 * @route POST /api/v1/windows-ssl/auto-install
 * @desc Auto-install SSL certificate for device (Windows integration)
 * @access Private (API Key Required)
 */
router.post('/auto-install',
  validateInput({
    deviceId: { type: 'string', required: true, minLength: 1 },
    domain: { type: 'string', required: true, minLength: 1 },
    certificateType: { type: 'string', required: false, enum: ['single', 'wildcard', 'multi'] },
    autoRenewal: { type: 'boolean', required: false }
  }),
  async (req, res) => {
    try {
      const { deviceId, domain, certificateType, autoRenewal } = req.body;
      
      logger.info('Windows SSL auto-installation request', { deviceId, domain, certificateType, autoRenewal });
      
      // Provision SSL certificate
      const sslResult = await sslService.provisionCertificate(deviceId, domain, {
        certificateType,
        autoRenewal
      });
      
      if (!sslResult.success) {
        return res.apiError('Failed to provision SSL certificate', 500);
      }
      
      // Install on Windows
      const windowsResult = await windowsSSLService.installCertificate(deviceId, sslResult.certificate);
      
      const result = {
        ssl: sslResult,
        windows: windowsResult,
        message: 'SSL certificate provisioned and installed on Windows 11 successfully'
      };
      
      res.apiSuccess(result, 'SSL certificate auto-installed successfully');
    } catch (error) {
      logger.error('Windows SSL auto-installation failed', { error: error.message, body: req.body });
      res.apiError('Failed to auto-install SSL certificate', 500, error.message);
    }
  }
);

/**
 * @route GET /api/v1/windows-ssl/health
 * @desc Get Windows SSL integration health status
 * @access Private (API Key Required)
 */
router.get('/health', async (req, res) => {
  try {
    logger.info('Windows SSL integration health check request');
    
    const health = await windowsSSLService.getHealthStatus();
    
    res.apiSuccess(health, 'Windows SSL integration health check completed');
  } catch (error) {
    logger.error('Windows SSL integration health check failed', { error: error.message });
    res.apiError('Windows SSL integration health check failed', 500, error.message);
  }
});

/**
 * @route GET /api/v1/windows-ssl/features
 * @desc Get Windows 11 SSL integration features
 * @access Private (API Key Required)
 */
router.get('/features', async (req, res) => {
  try {
    logger.info('Windows SSL integration features request');
    
    const features = {
      windows11: {
        certificateStore: 'LocalMachine\\My',
        powershellSupport: '5.1+',
        serviceIntegration: 'MyLZipSSLService',
        autoRenewal: 'Available',
        notificationArea: 'Available',
        enterpriseFeatures: 'Available'
      },
      sslManagement: {
        install: 'Automatic certificate installation',
        remove: 'Secure certificate removal',
        status: 'Real-time status monitoring',
        renewal: 'Automatic renewal management',
        monitoring: 'Certificate expiration alerts'
      },
      businessFeatures: {
        teamManagement: 'Multiple device management',
        compliance: 'Business compliance ready',
        reporting: 'Detailed SSL analytics',
        support: 'Priority business support'
      },
      pricing: {
        basic: 'Free with device registration',
        premium: '$19/month for advanced features',
        enterprise: '$99/month for team management'
      }
    };
    
    res.apiSuccess(features, 'Windows SSL integration features retrieved successfully');
  } catch (error) {
    logger.error('Windows SSL integration features retrieval failed', { error: error.message });
    res.apiError('Failed to retrieve Windows SSL integration features', 500, error.message);
  }
});

module.exports = router;
