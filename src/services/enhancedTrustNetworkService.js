const { logger } = require('../utils/logger');
const { databaseService } = require('./databaseService');
const { cacheService } = require('./cacheService');
const { monitoringService } = require('./monitoringService');

class EnhancedTrustNetworkService {
  constructor() {
    this.cacheKeyPrefix = 'enhanced_trust_network';
    this.cacheTTL = {
      enhancedSites: 300, // 5 minutes
      permissions: 900,    // 15 minutes
      deviceTokens: 3600   // 1 hour
    };
  }

  /**
   * Get all enhanced sites configuration
   */
  async getEnhancedSites() {
    try {
      const cacheKey = `${this.cacheKeyPrefix}:enhanced_sites`;
      let sites = await cacheService.get(cacheKey);

      if (!sites) {
        const query = `
          SELECT 
            id, domain, name, description, enhanced_features, 
            permission_requirements, ui_injection, config, 
            is_active, last_updated, created_at, updated_at
          FROM enhanced_sites 
          WHERE is_active = true 
          ORDER BY name ASC
        `;
        
        const result = await databaseService.query(query);
        sites = result.rows;

        // Cache the results
        await cacheService.set(cacheKey, sites, this.cacheTTL.enhancedSites);
        
        logger.info('Enhanced sites retrieved from database', { count: sites.length });
      } else {
        logger.debug('Enhanced sites retrieved from cache', { count: sites.length });
      }

      return sites;
    } catch (error) {
      logger.error('Error getting enhanced sites', { error: error.message });
      throw new Error('Failed to retrieve enhanced sites configuration');
    }
  }

  /**
   * Get enhanced site configuration by domain
   */
  async getEnhancedSiteByDomain(domain) {
    try {
      const cacheKey = `${this.cacheKeyPrefix}:site:${domain}`;
      let site = await cacheService.get(cacheKey);

      if (!site) {
        const query = `
          SELECT 
            id, domain, name, description, enhanced_features, 
            permission_requirements, ui_injection, config, 
            is_active, last_updated, created_at, updated_at
          FROM enhanced_sites 
          WHERE domain = $1 AND is_active = true
        `;
        
        const result = await databaseService.query(query, [domain]);
        site = result.rows[0];

        if (site) {
          // Cache the result
          await cacheService.set(cacheKey, site, this.cacheTTL.enhancedSites);
        }
      }

      return site;
    } catch (error) {
      logger.error('Error getting enhanced site by domain', { domain, error: error.message });
      throw new Error('Failed to retrieve enhanced site configuration');
    }
  }

  /**
   * Create or update enhanced site configuration
   */
  async upsertEnhancedSite(siteData) {
    try {
      const { domain, name, description, enhancedFeatures, permissionRequirements, uiInjection, config } = siteData;

      const query = `
        INSERT INTO enhanced_sites (domain, name, description, enhanced_features, permission_requirements, ui_injection, config)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (domain) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          enhanced_features = EXCLUDED.enhanced_features,
          permission_requirements = EXCLUDED.permission_requirements,
          ui_injection = EXCLUDED.ui_injection,
          config = EXCLUDED.config,
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const values = [domain, name, description, enhancedFeatures, permissionRequirements, uiInjection, config];
      const result = await databaseService.query(query, values);
      const site = result.rows[0];

      // Clear related caches
      await this.clearSiteCaches(domain);

      // Log the operation
      await this.logEnhancedSiteOperation('upsert', site.id, domain);

      logger.info('Enhanced site upserted successfully', { domain, siteId: site.id });
      return site;
    } catch (error) {
      logger.error('Error upserting enhanced site', { domain: siteData.domain, error: error.message });
      throw new Error('Failed to upsert enhanced site configuration');
    }
  }

  /**
   * Delete enhanced site configuration
   */
  async deleteEnhancedSite(siteId) {
    try {
      // Get site info before deletion for logging
      const siteQuery = 'SELECT domain FROM enhanced_sites WHERE id = $1';
      const siteResult = await databaseService.query(siteQuery, [siteId]);
      
      if (siteResult.rows.length === 0) {
        throw new Error('Enhanced site not found');
      }

      const domain = siteResult.rows[0].domain;

      const query = 'DELETE FROM enhanced_sites WHERE id = $1 RETURNING *';
      const result = await databaseService.query(query, [siteId]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to delete enhanced site');
      }

      // Clear related caches
      await this.clearSiteCaches(domain);

      // Log the operation
      await this.logEnhancedSiteOperation('delete', siteId, domain);

      logger.info('Enhanced site deleted successfully', { siteId, domain });
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting enhanced site', { siteId, error: error.message });
      throw new Error('Failed to delete enhanced site configuration');
    }
  }

  /**
   * Get user permissions by device ID
   */
  async getUserPermissions(deviceId) {
    try {
      const cacheKey = `${this.cacheKeyPrefix}:permissions:${deviceId}`;
      let permissions = await cacheService.get(cacheKey);

      if (!permissions) {
        const query = `
          SELECT 
            id, user_id, device_id, permissions, feature_access, 
            is_active, expires_at, last_verified, created_at, updated_at
          FROM user_permissions 
          WHERE device_id = $1 AND is_active = true
        `;
        
        const result = await databaseService.query(query, [deviceId]);
        permissions = result.rows[0];

        if (permissions) {
          // Cache the result
          await cacheService.set(cacheKey, permissions, this.cacheTTL.permissions);
        }
      }

      return permissions;
    } catch (error) {
      logger.error('Error getting user permissions', { deviceId, error: error.message });
      throw new Error('Failed to retrieve user permissions');
    }
  }

  /**
   * Validate user permissions for a specific site
   */
  async validatePermissions(deviceId, siteDomain) {
    try {
      // Get user permissions
      const userPermissions = await this.getUserPermissions(deviceId);
      if (!userPermissions) {
        return { hasAccess: false, reason: 'No permissions found' };
      }

      // Get site configuration
      const siteConfig = await this.getEnhancedSiteByDomain(siteDomain);
      if (!siteConfig) {
        return { hasAccess: false, reason: 'Site not configured for enhanced features' };
      }

      // Check if user has required permissions
      const requiredPermissions = siteConfig.permission_requirements || [];
      const userPerms = userPermissions.permissions || [];
      
      const hasRequiredPermissions = requiredPermissions.every(perm => 
        userPerms.includes(perm)
      );

      if (!hasRequiredPermissions) {
        return { 
          hasAccess: false, 
          reason: 'Insufficient permissions',
          required: requiredPermissions,
          has: userPerms
        };
      }

      // Check if permissions are expired
      if (userPermissions.expires_at && new Date() > new Date(userPermissions.expires_at)) {
        return { hasAccess: false, reason: 'Permissions expired' };
      }

      return { 
        hasAccess: true, 
        permissions: userPerms,
        features: siteConfig.enhanced_features,
        uiInjection: siteConfig.ui_injection,
        config: siteConfig.config
      };
    } catch (error) {
      logger.error('Error validating permissions', { deviceId, siteDomain, error: error.message });
      throw new Error('Failed to validate user permissions');
    }
  }

  /**
   * Create or update enhanced authentication state
   */
  async upsertEnhancedAuthState(authData) {
    try {
      const { deviceId, operatorId, deviceToken, permissions, expiresAt } = authData;

      const query = `
        INSERT INTO enhanced_auth_state (device_id, operator_id, device_token, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (device_id) 
        DO UPDATE SET 
          operator_id = EXCLUDED.operator_id,
          device_token = EXCLUDED.device_token,
          permissions = EXCLUDED.permissions,
          expires_at = EXCLUDED.expires_at,
          last_verified = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const values = [deviceId, operatorId, deviceToken, permissions, expiresAt];
      const result = await databaseService.query(query, values);
      const authState = result.rows[0];

      // Cache the auth state
      const cacheKey = `${this.cacheKeyPrefix}:auth:${deviceId}`;
      await cacheService.set(cacheKey, authState, this.cacheTTL.deviceTokens);

      logger.info('Enhanced auth state upserted successfully', { deviceId });
      return authState;
    } catch (error) {
      logger.error('Error upserting enhanced auth state', { deviceId, error: error.message });
      throw new Error('Failed to upsert enhanced authentication state');
    }
  }

  /**
   * Verify enhanced authentication state
   */
  async verifyEnhancedAuthState(deviceId, deviceToken) {
    try {
      const cacheKey = `${this.cacheKeyPrefix}:auth:${deviceId}`;
      let authState = await cacheService.get(cacheKey);

      if (!authState) {
        const query = `
          SELECT 
            id, device_id, operator_id, device_token, permissions, 
            last_verified, expires_at, is_active, created_at, updated_at
          FROM enhanced_auth_state 
          WHERE device_id = $1 AND is_active = true
        `;
        
        const result = await databaseService.query(query, [deviceId]);
        authState = result.rows[0];

        if (authState) {
          // Cache the result
          await cacheService.set(cacheKey, authState, this.cacheTTL.deviceTokens);
        }
      }

      if (!authState) {
        return { isValid: false, reason: 'No authentication state found' };
      }

      // Verify token
      if (authState.device_token !== deviceToken) {
        return { isValid: false, reason: 'Invalid device token' };
      }

      // Check expiration
      if (new Date() > new Date(authState.expires_at)) {
        return { isValid: false, reason: 'Authentication expired' };
      }

      // Update last verified
      await this.updateLastVerified(deviceId);

      return { 
        isValid: true, 
        permissions: authState.permissions,
        expiresAt: authState.expires_at,
        operatorId: authState.operator_id
      };
    } catch (error) {
      logger.error('Error verifying enhanced auth state', { deviceId, error: error.message });
      throw new Error('Failed to verify enhanced authentication state');
    }
  }

  /**
   * Log enhanced feature usage
   */
  async logFeatureUsage(deviceId, siteDomain, featureName, action, metadata = {}) {
    try {
      const query = `
        INSERT INTO enhanced_feature_logs 
        (device_id, site_domain, feature_name, action, ip_address, user_agent, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      const values = [deviceId, siteDomain, featureName, action, metadata.ipAddress, metadata.userAgent, metadata];
      await databaseService.query(query, values);

      // Send monitoring event
      monitoringService.trackEvent('enhanced_feature_usage', {
        deviceId,
        siteDomain,
        featureName,
        action
      });

      logger.debug('Enhanced feature usage logged', { deviceId, siteDomain, featureName, action });
    } catch (error) {
      logger.error('Error logging feature usage', { deviceId, siteDomain, featureName, error: error.message });
      // Don't throw error for logging failures
    }
  }

  /**
   * Log enhanced site access
   */
  async logSiteAccess(deviceId, siteDomain, accessType, permissionsUsed, featuresAccessed, metadata = {}) {
    try {
      const query = `
        INSERT INTO enhanced_site_access_logs 
        (device_id, site_domain, access_type, permissions_used, features_accessed, ip_address, user_agent, session_duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const values = [
        deviceId, 
        siteDomain, 
        accessType, 
        permissionsUsed, 
        featuresAccessed, 
        metadata.ipAddress, 
        metadata.userAgent, 
        metadata.sessionDuration
      ];
      
      await databaseService.query(query, values);

      // Send monitoring event
      monitoringService.trackEvent('enhanced_site_access', {
        deviceId,
        siteDomain,
        accessType,
        permissionsUsed: permissionsUsed.length,
        featuresAccessed: featuresAccessed.length
      });

      logger.debug('Enhanced site access logged', { deviceId, siteDomain, accessType });
    } catch (error) {
      logger.error('Error logging site access', { deviceId, siteDomain, accessType, error: error.message });
      // Don't throw error for logging failures
    }
  }

  /**
   * Update last verified timestamp
   */
  async updateLastVerified(deviceId) {
    try {
      const query = `
        UPDATE enhanced_auth_state 
        SET last_verified = CURRENT_TIMESTAMP 
        WHERE device_id = $1
      `;
      
      await databaseService.query(query, [deviceId]);
    } catch (error) {
      logger.error('Error updating last verified timestamp', { deviceId, error: error.message });
    }
  }

  /**
   * Clear site-related caches
   */
  async clearSiteCaches(domain) {
    try {
      const keys = [
        `${this.cacheKeyPrefix}:enhanced_sites`,
        `${this.cacheKeyPrefix}:site:${domain}`
      ];
      
      await Promise.all(keys.map(key => cacheService.del(key)));
      logger.debug('Site caches cleared', { domain });
    } catch (error) {
      logger.error('Error clearing site caches', { domain, error: error.message });
    }
  }

  /**
   * Log enhanced site operations
   */
  async logEnhancedSiteOperation(operation, siteId, domain) {
    try {
      const query = `
        INSERT INTO audit_logs (device_id, action, resource_type, resource_id, encrypted_details)
        VALUES ($1, $2, $3, $4, $5)
      `;

      const values = [
        'system', // System operation
        `enhanced_site_${operation}`,
        'enhanced_site',
        siteId,
        JSON.stringify({ domain, operation, timestamp: new Date().toISOString() })
      ];
      
      await databaseService.query(query, values);
    } catch (error) {
      logger.error('Error logging enhanced site operation', { operation, siteId, domain, error: error.message });
    }
  }

  /**
   * Get enhanced sites statistics
   */
  async getEnhancedSitesStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_sites,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_sites,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_sites
        FROM enhanced_sites
      `;
      
      const result = await databaseService.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting enhanced sites stats', { error: error.message });
      throw new Error('Failed to retrieve enhanced sites statistics');
    }
  }

  /**
   * Get user permissions statistics
   */
  async getUserPermissionsStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_permissions,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_permissions,
          COUNT(CASE WHEN expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_permissions
        FROM user_permissions
      `;
      
      const result = await databaseService.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user permissions stats', { error: error.message });
      throw new Error('Failed to retrieve user permissions statistics');
    }
  }
}

module.exports = new EnhancedTrustNetworkService();
