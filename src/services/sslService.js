const crypto = require('crypto');
const logger = require('../utils/logger');
const database = require('../config/database');
const redis = require('../config/redis');

class SSLService {
  constructor() {
    this.certificates = new Map(); // Fallback in-memory storage
    this.premiumUsers = new Set(); // Track premium users
    this.letsEncryptConfig = {
      staging: process.env.NODE_ENV === 'development',
      email: process.env.LETS_ENCRYPT_EMAIL || 'ssl@myl.zip',
      server: process.env.NODE_ENV === 'development'
        ? 'https://acme-staging-v02.api.letsencrypt.org/directory'
        : 'https://acme-v02.api.letsencrypt.org/directory',
    };
    
    // Cache configuration
    this.cacheConfig = {
      ttl: 3600, // 1 hour
      prefix: 'cert:',
      batchSize: 100
    };
  }

  /**
   * Provision SSL certificate for UUID subdomain (e.g., deviceId.myl.zip)
   * @param {string} deviceId - Device identifier
   * @param {string} uuidSubdomain - UUID subdomain (e.g., deviceId.myl.zip)
   * @param {Object} options - Certificate options
   * @returns {Object} Certificate information
   */
  async provisionUUIDSubdomain(deviceId, uuidSubdomain, options = {}) {
    try {
      logger.info('Provisioning UUID subdomain SSL certificate', { deviceId, uuidSubdomain, options });

      // Verify UUID subdomain format
      if (!uuidSubdomain.endsWith('.myl.zip')) {
        throw new Error('Invalid UUID subdomain format. Must end with .myl.zip');
      }

      // Check if device already has a certificate in database
      const existingCertificate = await this.getCertificateFromDatabase(deviceId);
      if (existingCertificate && existingCertificate.uuid_subdomain === uuidSubdomain && existingCertificate.status === 'active') {
        return {
          success: true,
          certificate: existingCertificate,
          message: 'UUID subdomain certificate already exists and is valid',
        };
      }

      // Generate certificate data for UUID subdomain
      const certificate = await this.generateUUIDSubdomainCertificate(deviceId, uuidSubdomain, options);

      // Store certificate in database
      await this.saveCertificateToDatabase(certificate);

      // Update cache
      await this.updateCertificateCache(deviceId, certificate);

      logger.info('UUID subdomain SSL certificate provisioned successfully', { deviceId, uuidSubdomain });

      return {
        success: true,
        certificate,
        message: 'UUID subdomain SSL certificate provisioned successfully',
      };
    } catch (error) {
      logger.error('Failed to provision UUID subdomain SSL certificate', { deviceId, uuidSubdomain, error: error.message });
      throw error;
    }
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
            message: 'Certificate already exists and is valid',
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
        message: 'SSL certificate provisioned successfully',
      };
    } catch (error) {
      logger.error('Failed to provision SSL certificate', { deviceId, domain, error: error.message });
      throw error;
    }
  }

  /**
   * Generate UUID subdomain SSL certificate (uses wildcard *.myl.zip)
   * @param {string} deviceId - Device identifier
   * @param {string} uuidSubdomain - UUID subdomain (e.g., deviceId.myl.zip)
   * @param {Object} options - Certificate options
   * @returns {Object} Generated certificate
   */
  async generateUUIDSubdomainCertificate(deviceId, uuidSubdomain, options) {
    // Simulate wildcard certificate for *.myl.zip
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days

    const certificate = {
      id: crypto.randomUUID(),
      deviceId,
      uuidSubdomain,
      domain: '*.myl.zip', // Wildcard certificate
      type: 'wildcard',
      status: 'active',
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      autoRenewal: options.autoRenewal !== false,
      certificateData: {
        // Simulated certificate data
        serialNumber: crypto.randomBytes(16).toString('hex'),
        issuer: 'Google Cloud Certificate Authority',
        subject: 'CN=*.myl.zip',
        validFrom: now.toISOString(),
        validTo: expiresAt.toISOString(),
        san: ['*.myl.zip', uuidSubdomain], // Subject Alternative Names
      },
      privateKey: crypto.randomBytes(32).toString('hex'), // Simulated private key
      publicKey: crypto.randomBytes(64).toString('hex'), // Simulated public key
      premium: false,
      features: this.getBasicFeatures(),
      userInitials: options.userInitials,
      deviceName: options.deviceName,
    };

    return certificate;
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
        validTo: expiresAt.toISOString(),
      },
      privateKey: crypto.randomBytes(32).toString('hex'), // Simulated private key
      publicKey: crypto.randomBytes(64).toString('hex'), // Simulated public key
      premium: false,
      features: this.getBasicFeatures(),
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
      // Try cache first
      let certificate = await this.getCertificateFromCache(deviceId);
      
      // If not in cache, get from database
      if (!certificate) {
        certificate = await this.getCertificateFromDatabase(deviceId);
        if (certificate) {
          await this.updateCertificateCache(deviceId, certificate);
        }
      }

      if (!certificate) {
        return {
          success: false,
          message: 'No SSL certificate found for device',
          status: 'not_provisioned',
        };
      }

      const isExpired = new Date(certificate.expires_at) < new Date();
      const daysUntilExpiry = Math.ceil((new Date(certificate.expires_at) - new Date()) / (1000 * 60 * 60 * 24));

      return {
        success: true,
        certificate: {
          ...certificate,
          expired: isExpired,
          daysUntilExpiry: Math.max(0, daysUntilExpiry),
          needsRenewal: daysUntilExpiry <= 30,
        },
        status: isExpired ? 'expired' : 'active',
      };
    } catch (error) {
      logger.error('Failed to get SSL device status', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Get certificate from database
   * @param {string} deviceId - Device identifier
   * @returns {Object|null} Certificate data
   */
  async getCertificateFromDatabase(deviceId) {
    try {
      // Check if database is available
      if (!database.pool) {
        logger.warn('Database not available, skipping database lookup', { deviceId });
        return null;
      }
      
      const result = await database.query(
        'SELECT * FROM device_certificates WHERE device_id = $1 AND status = $2',
        [deviceId, 'active']
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get certificate from database', { deviceId, error: error.message });
      // Return null instead of throwing to allow graceful degradation
      return null;
    }
  }

  /**
   * Save certificate to database
   * @param {Object} certificate - Certificate data
   */
  async saveCertificateToDatabase(certificate) {
    try {
      // Check if database is available
      if (!database.pool) {
        logger.warn('Database not available, skipping database save', { deviceId: certificate.deviceId });
        return certificate; // Return the certificate as if it was saved
      }
      
      const result = await database.query(
        `INSERT INTO device_certificates (
          device_id, uuid_subdomain, certificate_data, status, expires_at, 
          user_initials, device_name, certificate_type, auto_renewal, premium
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (device_id) 
        DO UPDATE SET 
          uuid_subdomain = EXCLUDED.uuid_subdomain,
          certificate_data = EXCLUDED.certificate_data,
          status = EXCLUDED.status,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          certificate.deviceId,
          certificate.uuidSubdomain,
          JSON.stringify(certificate),
          certificate.status,
          certificate.expiresAt,
          certificate.userInitials,
          certificate.deviceName,
          certificate.type,
          certificate.autoRenewal,
          certificate.premium
        ]
      );
      
      logger.info('Certificate saved to database', { deviceId: certificate.deviceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save certificate to database', { deviceId: certificate.deviceId, error: error.message });
      // Return the certificate as if it was saved to allow graceful degradation
      return certificate;
    }
  }

  /**
   * Get certificate from cache
   * @param {string} deviceId - Device identifier
   * @returns {Object|null} Certificate data
   */
  async getCertificateFromCache(deviceId) {
    try {
      if (!redis.isRedisConnected()) {
        return null;
      }
      
      const cacheKey = `${this.cacheConfig.prefix}${deviceId}`;
      return await redis.get(cacheKey);
    } catch (error) {
      logger.warn('Failed to get certificate from cache', { deviceId, error: error.message });
      return null;
    }
  }

  /**
   * Update certificate cache
   * @param {string} deviceId - Device identifier
   * @param {Object} certificate - Certificate data
   */
  async updateCertificateCache(deviceId, certificate) {
    try {
      if (!redis.isRedisConnected()) {
        return;
      }
      
      const cacheKey = `${this.cacheConfig.prefix}${deviceId}`;
      await redis.set(cacheKey, certificate, this.cacheConfig.ttl);
      
      logger.debug('Certificate cache updated', { deviceId });
    } catch (error) {
      logger.warn('Failed to update certificate cache', { deviceId, error: error.message });
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
          autoRenewal: certificate.autoRenewal,
        },
      );

      // Update stored certificate
      this.certificates.set(deviceId, renewedCertificate);

      logger.info('SSL certificate renewed successfully', { deviceId });

      return {
        success: true,
        certificate: renewedCertificate,
        message: 'SSL certificate renewed successfully',
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
        message: 'SSL certificate revoked successfully',
      };
    } catch (error) {
      logger.error('Failed to revoke SSL certificate', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Generate API key for device with UUID subdomain SSL certificate
   * @param {string} deviceId - Device identifier
   * @param {Object} options - Device options
   * @returns {Object} Generated API key information
   */
  async generateDeviceApiKey(deviceId, options = {}) {
    try {
      logger.info('Generating device API key', { deviceId, options });

      // Verify device has valid UUID subdomain SSL certificate
      const sslStatus = await this.getDeviceStatus(deviceId);
      if (!sslStatus.success || !sslStatus.certificate || sslStatus.certificate.expired) {
        throw new Error('Device must have a valid UUID subdomain SSL certificate to generate API key');
      }

      // Generate device-specific API key
      const apiKey = `dev_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      // Create device API key record
      const deviceApiKey = {
        deviceId,
        apiKey,
        keyHash,
        deviceName: options.deviceName || 'Unknown Device',
        userInitials: options.userInitials || 'Unknown',
        permissions: options.permissions || ['ssl:read', 'device:read', 'api:access'],
        rateLimit: options.rateLimit || 1000, // requests per hour
        expiresAt: options.expiresAt || new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days default
        uuidSubdomain: sslStatus.certificate.uuid_subdomain,
      };

      // Store the API key in database
      await this.saveApiKeyToDatabase(deviceApiKey);

      logger.info('Device API key generated successfully', { deviceId, deviceName: deviceApiKey.deviceName });

      return {
        success: true,
        data: {
          apiKey: deviceApiKey.apiKey, // Only returned once
          deviceId: deviceApiKey.deviceId,
          deviceName: deviceApiKey.deviceName,
          userInitials: deviceApiKey.userInitials,
          permissions: deviceApiKey.permissions,
          rateLimit: deviceApiKey.rateLimit,
          expiresAt: deviceApiKey.expiresAt,
          createdAt: new Date().toISOString(),
          uuidSubdomain: deviceApiKey.uuidSubdomain,
        },
        message: 'Device API key generated successfully',
      };
    } catch (error) {
      logger.error('Failed to generate device API key', { deviceId, error: error.message });
      throw error;
    }
  }

  /**
   * Save API key to database
   * @param {Object} apiKey - API key data
   */
  async saveApiKeyToDatabase(apiKey) {
    try {
      const result = await database.query(
        `INSERT INTO device_api_keys (
          device_id, api_key, key_hash, device_name, user_initials, 
          permissions, rate_limit, expires_at, uuid_subdomain
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          apiKey.deviceId,
          apiKey.apiKey,
          apiKey.keyHash,
          apiKey.deviceName,
          apiKey.userInitials,
          JSON.stringify(apiKey.permissions),
          apiKey.rateLimit,
          apiKey.expiresAt,
          apiKey.uuidSubdomain
        ]
      );
      
      logger.info('API key saved to database', { deviceId: apiKey.deviceId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to save API key to database', { deviceId: apiKey.deviceId, error: error.message });
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
        lastUsedAt: null,
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
          createdAt: extensionApiKey.createdAt,
        },
        message: 'Extension API key generated successfully',
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
          message: 'Device is already premium',
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
        premiumFeatures: certificate.features,
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
          features: this.getPremiumFeaturesList(),
        },
      };
    }

    return {
      success: true,
      features: certificate.features,
      message: 'Premium features available',
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
        advancedAnalytics: true,
      },
      message: 'Advanced SSL management features available',
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
      'standard_support',
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
      'team_management',
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
      currency: 'USD',
    };
  }
}

module.exports = new SSLService();
