const enhancedTrustNetworkService = require('../services/enhancedTrustNetworkService');
const logger = require('../utils/logger');

class EnhancedTrustNetworkController {
  /**
   * Get all enhanced sites configuration
   */
  async getEnhancedSites(req, res) {
    try {
      const sites = await enhancedTrustNetworkService.getEnhancedSites();

      logger.info('Enhanced sites retrieved successfully', { count: sites.length });

      res.json({
        success: true,
        message: 'Enhanced sites retrieved successfully',
        data: {
          sites: sites.map(site => ({
            id: site.id,
            domain: site.domain,
            name: site.name,
            description: site.description,
            enhancedFeatures: site.enhanced_features,
            permissionRequirements: site.permission_requirements,
            uiInjection: site.ui_injection,
            config: site.config,
            lastUpdated: site.last_updated,
            isActive: site.is_active,
          })),
        },
      });
    } catch (error) {
      logger.error('Error getting enhanced sites', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve enhanced sites',
        message: error.message,
      });
    }
  }

  /**
   * Get enhanced site configuration by domain
   */
  async getEnhancedSiteByDomain(req, res) {
    try {
      const { domain } = req.params;

      if (!domain) {
        return res.status(400).json({
          success: false,
          error: 'Domain parameter required',
          message: 'Domain parameter is required',
        });
      }

      const site = await enhancedTrustNetworkService.getEnhancedSiteByDomain(domain);

      if (!site) {
        return res.status(404).json({
          success: false,
          error: 'Site not found',
          message: `No enhanced configuration found for domain: ${domain}`,
        });
      }

      logger.info('Enhanced site retrieved successfully', { domain });

      res.json({
        success: true,
        message: 'Enhanced site configuration retrieved successfully',
        data: {
          id: site.id,
          domain: site.domain,
          name: site.name,
          description: site.description,
          enhancedFeatures: site.enhanced_features,
          permissionRequirements: site.permission_requirements,
          uiInjection: site.ui_injection,
          config: site.config,
          lastUpdated: site.last_updated,
          isActive: site.is_active,
        },
      });
    } catch (error) {
      logger.error('Error getting enhanced site by domain', { domain: req.params.domain, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve enhanced site configuration',
        message: error.message,
      });
    }
  }

  /**
   * Create or update enhanced site configuration
   */
  async upsertEnhancedSite(req, res) {
    try {
      const { domain, name, description, enhancedFeatures, permissionRequirements, uiInjection, config } = req.body;

      // Validation
      if (!domain || !name) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Domain and name are required fields',
        });
      }

      if (!Array.isArray(enhancedFeatures) || !Array.isArray(permissionRequirements)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid data types',
          message: 'enhancedFeatures and permissionRequirements must be arrays',
        });
      }

      const siteData = {
        domain,
        name,
        description: description || '',
        enhancedFeatures: enhancedFeatures || [],
        permissionRequirements: permissionRequirements || [],
        uiInjection: uiInjection || {},
        config: config || {},
      };

      const site = await enhancedTrustNetworkService.upsertEnhancedSite(siteData);

      logger.info('Enhanced site upserted successfully', { domain, siteId: site.id });

      res.status(201).json({
        success: true,
        message: 'Enhanced site configuration saved successfully',
        data: {
          id: site.id,
          domain: site.domain,
          name: site.name,
          description: site.description,
          enhancedFeatures: site.enhanced_features,
          permissionRequirements: site.permission_requirements,
          uiInjection: site.ui_injection,
          config: site.config,
          lastUpdated: site.last_updated,
          isActive: site.is_active,
        },
      });
    } catch (error) {
      logger.error('Error upserting enhanced site', { domain: req.body.domain, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save enhanced site configuration',
        message: error.message,
      });
    }
  }

  /**
   * Update enhanced site configuration
   */
  async updateEnhancedSite(req, res) {
    try {
      const { siteId } = req.params;
      const updateData = req.body;

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: 'Site ID required',
          message: 'Site ID parameter is required',
        });
      }

      // Get existing site to merge with update data
      const existingSite = await enhancedTrustNetworkService.getEnhancedSiteByDomain(updateData.domain);
      if (!existingSite) {
        return res.status(404).json({
          success: false,
          error: 'Site not found',
          message: 'Enhanced site not found',
        });
      }

      const mergedData = {
        domain: updateData.domain || existingSite.domain,
        name: updateData.name || existingSite.name,
        description: updateData.description || existingSite.description,
        enhancedFeatures: updateData.enhancedFeatures || existingSite.enhanced_features,
        permissionRequirements: updateData.permissionRequirements || existingSite.permission_requirements,
        uiInjection: updateData.uiInjection || existingSite.ui_injection,
        config: updateData.config || existingSite.config,
      };

      const site = await enhancedTrustNetworkService.upsertEnhancedSite(mergedData);

      logger.info('Enhanced site updated successfully', { siteId, domain: site.domain });

      res.json({
        success: true,
        message: 'Enhanced site configuration updated successfully',
        data: {
          id: site.id,
          domain: site.domain,
          name: site.name,
          description: site.description,
          enhancedFeatures: site.enhanced_features,
          permissionRequirements: site.permission_requirements,
          uiInjection: site.ui_injection,
          config: site.config,
          lastUpdated: site.last_updated,
          isActive: site.is_active,
        },
      });
    } catch (error) {
      logger.error('Error updating enhanced site', { siteId: req.params.siteId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to update enhanced site configuration',
        message: error.message,
      });
    }
  }

  /**
   * Delete enhanced site configuration
   */
  async deleteEnhancedSite(req, res) {
    try {
      const { siteId } = req.params;

      if (!siteId) {
        return res.status(400).json({
          success: false,
          error: 'Site ID required',
          message: 'Site ID parameter is required',
        });
      }

      const deletedSite = await enhancedTrustNetworkService.deleteEnhancedSite(siteId);

      logger.info('Enhanced site deleted successfully', { siteId, domain: deletedSite.domain });

      res.json({
        success: true,
        message: 'Enhanced site configuration deleted successfully',
        data: {
          id: deletedSite.id,
          domain: deletedSite.domain,
          name: deletedSite.name,
        },
      });
    } catch (error) {
      logger.error('Error deleting enhanced site', { siteId: req.params.siteId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to delete enhanced site configuration',
        message: error.message,
      });
    }
  }

  /**
   * Get user permissions by device ID
   */
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID required',
          message: 'User ID parameter is required',
        });
      }

      const permissions = await enhancedTrustNetworkService.getUserPermissions(userId);

      if (!permissions) {
        return res.status(404).json({
          success: false,
          error: 'Permissions not found',
          message: `No permissions found for user: ${userId}`,
        });
      }

      logger.info('User permissions retrieved successfully', { userId });

      res.json({
        success: true,
        message: 'User permissions retrieved successfully',
        data: {
          id: permissions.id,
          userId: permissions.user_id,
          deviceId: permissions.device_id,
          permissions: permissions.permissions,
          featureAccess: permissions.feature_access,
          isActive: permissions.is_active,
          expiresAt: permissions.expires_at,
          lastVerified: permissions.last_verified,
        },
      });
    } catch (error) {
      logger.error('Error getting user permissions', { userId: req.params.userId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user permissions',
        message: error.message,
      });
    }
  }

  /**
   * Validate user permissions for a specific site
   */
  async validatePermissions(req, res) {
    try {
      const { deviceId, siteDomain } = req.body;

      if (!deviceId || !siteDomain) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Device ID and site domain are required fields',
        });
      }

      const validation = await enhancedTrustNetworkService.validatePermissions(deviceId, siteDomain);

      logger.info('Permissions validation completed', { deviceId, siteDomain, hasAccess: validation.hasAccess });

      res.json({
        success: true,
        message: 'Permissions validation completed',
        data: validation,
      });
    } catch (error) {
      logger.error('Error validating permissions', { deviceId: req.body.deviceId, siteDomain: req.body.siteDomain, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to validate permissions',
        message: error.message,
      });
    }
  }

  /**
   * Create or update enhanced authentication state
   */
  async upsertEnhancedAuthState(req, res) {
    try {
      const { deviceId, operatorId, deviceToken, permissions, expiresAt } = req.body;

      // Validation
      if (!deviceId || !deviceToken || !permissions || !expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Device ID, device token, permissions, and expiration are required fields',
        });
      }

      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid permissions format',
          message: 'Permissions must be an array',
        });
      }

      const authData = {
        deviceId,
        operatorId: operatorId || null,
        deviceToken,
        permissions,
        expiresAt: new Date(expiresAt),
      };

      const authState = await enhancedTrustNetworkService.upsertEnhancedAuthState(authData);

      logger.info('Enhanced auth state upserted successfully', { deviceId });

      res.status(201).json({
        success: true,
        message: 'Enhanced authentication state saved successfully',
        data: {
          id: authState.id,
          deviceId: authState.device_id,
          operatorId: authState.operator_id,
          permissions: authState.permissions,
          expiresAt: authState.expires_at,
          lastVerified: authState.last_verified,
        },
      });
    } catch (error) {
      logger.error('Error upserting enhanced auth state', { deviceId: req.body.deviceId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to save enhanced authentication state',
        message: error.message,
      });
    }
  }

  /**
   * Verify enhanced authentication state
   */
  async verifyEnhancedAuthState(req, res) {
    try {
      const { deviceId, deviceToken } = req.body;

      if (!deviceId || !deviceToken) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Device ID and device token are required fields',
        });
      }

      const verification = await enhancedTrustNetworkService.verifyEnhancedAuthState(deviceId, deviceToken);

      logger.info('Enhanced auth state verification completed', { deviceId, isValid: verification.isValid });

      res.json({
        success: true,
        message: 'Enhanced authentication state verification completed',
        data: verification,
      });
    } catch (error) {
      logger.error('Error verifying enhanced auth state', { deviceId: req.body.deviceId, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to verify enhanced authentication state',
        message: error.message,
      });
    }
  }

  /**
   * Log enhanced feature usage
   */
  async logFeatureUsage(req, res) {
    try {
      const { deviceId, siteDomain, featureName, action, metadata } = req.body;

      // Validation
      if (!deviceId || !siteDomain || !featureName || !action) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Device ID, site domain, feature name, and action are required fields',
        });
      }

      await enhancedTrustNetworkService.logFeatureUsage(deviceId, siteDomain, featureName, action, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        ...metadata,
      });

      logger.info('Enhanced feature usage logged successfully', { deviceId, siteDomain, featureName, action });

      res.json({
        success: true,
        message: 'Feature usage logged successfully',
      });
    } catch (error) {
      logger.error('Error logging feature usage', { deviceId: req.body.deviceId, siteDomain: req.body.siteDomain, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to log feature usage',
        message: error.message,
      });
    }
  }

  /**
   * Log enhanced site access
   */
  async logSiteAccess(req, res) {
    try {
      const { deviceId, siteDomain, accessType, permissionsUsed, featuresAccessed, sessionDuration } = req.body;

      // Validation
      if (!deviceId || !siteDomain || !accessType) {
        return res.status(400).json({
          success: false,
          error: 'Required fields missing',
          message: 'Device ID, site domain, and access type are required fields',
        });
      }

      if (!Array.isArray(permissionsUsed)) permissionsUsed = [];
      if (!Array.isArray(featuresAccessed)) featuresAccessed = [];

      await enhancedTrustNetworkService.logSiteAccess(deviceId, siteDomain, accessType, permissionsUsed, featuresAccessed, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionDuration: sessionDuration || null,
      });

      logger.info('Enhanced site access logged successfully', { deviceId, siteDomain, accessType });

      res.json({
        success: true,
        message: 'Site access logged successfully',
      });
    } catch (error) {
      logger.error('Error logging site access', { deviceId: req.body.deviceId, siteDomain: req.body.siteDomain, error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to log site access',
        message: error.message,
      });
    }
  }

  /**
   * Get enhanced sites statistics
   */
  async getEnhancedSitesStats(req, res) {
    try {
      const stats = await enhancedTrustNetworkService.getEnhancedSitesStats();

      logger.info('Enhanced sites statistics retrieved successfully');

      res.json({
        success: true,
        message: 'Enhanced sites statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting enhanced sites stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve enhanced sites statistics',
        message: error.message,
      });
    }
  }

  /**
   * Get user permissions statistics
   */
  async getUserPermissionsStats(req, res) {
    try {
      const stats = await enhancedTrustNetworkService.getUserPermissionsStats();

      logger.info('User permissions statistics retrieved successfully');

      res.json({
        success: true,
        message: 'User permissions statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting user permissions stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user permissions statistics',
        message: error.message,
      });
    }
  }
}

module.exports = new EnhancedTrustNetworkController();
