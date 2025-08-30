const crypto = require('crypto');
const logger = require('../utils/logger');

class SSLService {
  constructor() {
    this.certificates = new Map(); // In-memory storage for development
    this.premiumUsers = new Set(); // Track premium users
    this.letsEncryptConfig = {
      staging: process.env.NODE_ENV === 'development',
      email: process.env.LETS_ENCRYPT_EMAIL || 'ssl@myl.zip',
      server: process.env.NODE_ENV === 'development' 
        ? 'https://acme-staging-v02.api.letsencrypt.org/directory'
        : 'https://acme-v02.api.letsencrypt.org/directory'
    };
  }

  /**
   * Provision SSL certificate for a device
   * @param {string} deviceId - Device identifier
   * @param {string} domain - Domain for the certificate
   * @param {Object} options - Certificate options
   * @returns {Object} Certificate information
   */
  async provisionCertificate(deviceId, domain, options = {}) {
    try {
      logger.info('Provisioning SSL certificate', { deviceId, domain, options });

      // Check if device already has a certificate
      if (this.certificates.has(deviceId)) {
        const existing = this.certificates.get(deviceId);
        if (existing.domain === domain && !existing.expired) {
          return {
            success: true,
            certificate: existing,
            message: 'Certificate already exists and is valid'
          };
        }
      }

      // Generate certificate data (simulated for development)
      const certificate = await this.generateCertificate(deviceId, domain, options);
      
      // Store certificate
      this.certificates.set(deviceId, certificate);

      logger.info('SSL certificate provisioned successfully', { deviceId, domain });
      
      return {
        success: true,
        certificate,
        message: 'SSL certificate provisioned successfully'
      };
    } catch (error) {
      logger.error('Failed to provision SSL certificate', { deviceId, domain, error: error.message });
      throw error;
    }
  }

  /**
   * Generate SSL certificate (simulated for development)
   * @param {string} deviceId - Device identifier
   * @param {string} domain - Domain for the certificate
   * @param {Object} options - Certificate options
   * @returns {Object} Generated certificate
   */
  async generateCertificate(deviceId, domain, options) {
    // Simulate Let's Encrypt certificate generation
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days
    
    const certificate = {
      id: crypto.randomUUID(),
      deviceId,
      domain,
      type: options.certificateType || 'single',
      status: 'active',
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      autoRenewal: options.autoRenewal !== false,
      certificateData: {
        // Simulated certificate data
        serialNumber: crypto.randomBytes(16).toString('hex'),
        issuer: 'Let\'s Encrypt Authority X3',
        subject: `CN=${domain}`,
        validFrom: now.toISOString(),
        validTo: expiresAt.toISOString()
      },
      privateKey: crypto.randomBytes(32).toString('hex'), // Simulated private key
      publicKey: crypto.randomBytes(64).toString('hex'), // Simulated public key
      premium: false,
      features: this.getBasicFeatures()
    };

    return certificate;
  }

  /**
   * Get SSL status for a device
   * @param {string} deviceId - Device identifier
   * @returns {Object} SSL status information
   */
  async getDeviceStatus(deviceId) {
    try {
      const certificate = this.certificates.get(deviceId);
      
      if (!certificate) {
        return {
          success: false,
          message: 'No SSL certificate found for device',
          status: 'not_provisioned'
        };
      }

      const isExpired = new Date(certificate.expiresAt) < new Date();
      const daysUntilExpiry = Math.ceil((new Date(certificate.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        certificate: {
          ...certificate,
          expired: isExpired,
          daysUntilExpiry: Math.max(0, daysUntilExpiry),
          needsRenewal: daysUntilExpiry <= 30
        },
        status: isExpired ? 'expired' : 'active'
      };
    } catch (error) {
      logger.error('Failed to get SSL device status', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Renew SSL certificate
   * @param {string} deviceId - Device identifier
   * @returns {Object} Renewal result
   */
  async renewCertificate(deviceId) {
    try {
      const certificate = this.certificates.get(deviceId);
      
      if (!certificate) {
        throw new Error('No certificate found for device');
      }

      if (!certificate.autoRenewal) {
        throw new Error('Auto-renewal is disabled for this certificate');
      }

      // Simulate certificate renewal
      const renewedCertificate = await this.generateCertificate(
        deviceId, 
        certificate.domain, 
        { 
          certificateType: certificate.type,
          autoRenewal: certificate.autoRenewal 
        }
      );

      // Update stored certificate
      this.certificates.set(deviceId, renewedCertificate);

      logger.info('SSL certificate renewed successfully', { deviceId });
      
      return {
        success: true,
        certificate: renewedCertificate,
        message: 'SSL certificate renewed successfully'
      };
    } catch (error) {
      logger.error('Failed to renew SSL certificate', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Revoke SSL certificate
   * @param {string} deviceId - Device identifier
   * @returns {Object} Revocation result
   */
  async revokeCertificate(deviceId) {
    try {
      const certificate = this.certificates.get(deviceId);
      
      if (!certificate) {
        throw new Error('No certificate found for device');
      }

      // Mark certificate as revoked
      certificate.status = 'revoked';
      certificate.revokedAt = new Date().toISOString();

      logger.info('SSL certificate revoked successfully', { deviceId });
      
      return {
        success: true,
        message: 'SSL certificate revoked successfully'
      };
    } catch (error) {
      logger.error('Failed to revoke SSL certificate', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate API key for Chrome extension with SSL-certified device
   * @param {string} deviceId - Device identifier
   * @param {Object} options - Extension options
   * @returns {Object} Generated API key information
   */
  async generateExtensionApiKey(deviceId, options = {}) {
    try {
      logger.info('Generating extension API key', { deviceId, options });

      // Verify device has valid SSL certificate
      const sslStatus = await this.getDeviceStatus(deviceId);
      if (!sslStatus.success || !sslStatus.certificate || sslStatus.certificate.expired) {
        throw new Error('Device must have a valid SSL certificate to generate extension API key');
      }

      // Generate extension-specific API key
      const apiKey = `ext_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Create extension API key record
      const extensionApiKey = {
        id: crypto.randomUUID(),
        deviceId,
        apiKey,
        keyHash,
        extensionName: options.extensionName || 'Chrome Extension',
        permissions: options.permissions || ['ssl:read', 'device:read'],
        rateLimit: options.rateLimit || 1000, // requests per hour
        expiresAt: options.expiresAt || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days default
        createdAt: new Date().toISOString(),
        isActive: true,
        lastUsedAt: null
      };

      // Store the API key (in production, this would be in a database)
      if (!this.extensionApiKeys) {
        this.extensionApiKeys = new Map();
      }
      this.extensionApiKeys.set(keyHash, extensionApiKey);

      logger.info('Extension API key generated successfully', { deviceId, extensionName: extensionApiKey.extensionName });
      
      return {
        success: true,
        data: {
          apiKey: extensionApiKey.apiKey, // Only returned once
          deviceId: extensionApiKey.deviceId,
          extensionName: extensionApiKey.extensionName,
          permissions: extensionApiKey.permissions,
          rateLimit: extensionApiKey.rateLimit,
          expiresAt: extensionApiKey.expiresAt,
          createdAt: extensionApiKey.createdAt
        },
        message: 'Extension API key generated successfully'
      };
    } catch (error) {
      logger.error('Failed to generate extension API key', { deviceId, error: error.message });
            throw error;
    }
  }

  /**
   * Upgrade device to premium SSL
   * @param {string} deviceId - Device identifier
   * @returns {Object} Upgrade result
   */
  async upgradeToPremium(deviceId) {
    try {
      const certificate = this.certificates.get(deviceId);
      
      if (!certificate) {
        throw new Error('No certificate found for device');
      }

      if (certificate.premium) {
        return {
          success: false,
          message: 'Device is already premium'
        };
      }

      // Upgrade to premium
      certificate.premium = true;
      certificate.premiumUpgradedAt = new Date().toISOString();
      certificate.features = this.getPremiumFeatures();

      // Add to premium users set
      this.premiumUsers.add(deviceId);

      logger.info('Device upgraded to premium SSL', { deviceId });
      
      return {
        success: true,
        certificate,
        message: 'Successfully upgraded to premium SSL',
        premiumFeatures: certificate.features
      };
    } catch (error) {
      logger.error('Failed to upgrade to premium SSL', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Get premium features for a device
   * @param {string} deviceId - Device identifier
   * @returns {Object} Premium features
   */
  async getPremiumFeatures(deviceId) {
    const certificate = this.certificates.get(deviceId);
    const isPremium = certificate && certificate.premium;
    
    if (!isPremium) {
      return {
        success: false,
        message: 'Premium features not available',
        upgradeRequired: true,
        pricing: {
          monthly: 19.00,
          currency: 'USD',
          features: this.getPremiumFeaturesList()
        }
      };
    }

    return {
      success: true,
      features: certificate.features,
      message: 'Premium features available'
    };
  }

  /**
   * Get advanced SSL management features
   * @param {string} deviceId - Device identifier
   * @returns {Object} Advanced management features
   */
  async getAdvancedManagement(deviceId) {
    const certificate = this.certificates.get(deviceId);
    
    if (!certificate) {
      throw new Error('No certificate found for device');
    }

    if (!certificate.premium) {
      throw new Error('Premium subscription required for advanced management');
    }

    return {
      success: true,
      advancedFeatures: {
        wildcardSupport: true,
        multiDomainSupport: true,
        customDomains: true,
        sslMonitoring: true,
        hstsConfiguration: true,
        ocspStapling: true,
        apiAccess: true,
        prioritySupport: true,
        advancedAnalytics: true
      },
      message: 'Advanced SSL management features available'
    };
  }

  /**
   * Get basic SSL features
   * @returns {Array} Basic features list
   */
  getBasicFeatures() {
    return [
      'single_domain_certificate',
      'automatic_renewal',
      'basic_ssl_management',
      'standard_support'
    ];
  }

  /**
   * Get premium SSL features
   * @returns {Array} Premium features list
   */
  getPremiumFeaturesList() {
    return [
      'wildcard_certificates',
      'multi_domain_certificates',
      'custom_domains',
      'ssl_monitoring',
      'hsts_configuration',
      'ocsp_stapling',
      'api_access',
      'priority_support',
      'advanced_analytics',
      'team_management'
    ];
  }

  /**
   * Get all certificates (admin function)
   * @returns {Array} All certificates
   */
  async getAllCertificates() {
    return Array.from(this.certificates.values());
  }

  /**
   * Get premium users count
   * @returns {number} Premium users count
   */
  async getPremiumUsersCount() {
    return this.premiumUsers.size;
  }

  /**
   * Get revenue metrics
   * @returns {Object} Revenue metrics
   */
  async getRevenueMetrics() {
    const totalUsers = this.certificates.size;
    const premiumUsers = this.premiumUsers.size;
    const monthlyRevenue = premiumUsers * 19.00;
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

    return {
      totalUsers,
      premiumUsers,
      monthlyRevenue: parseFloat(monthlyRevenue.toFixed(2)),
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      currency: 'USD'
    };
  }
}

module.exports = new SSLService();
