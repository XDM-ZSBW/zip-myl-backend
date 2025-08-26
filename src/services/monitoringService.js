const { logger } = require('../utils/logger');
const crypto = require('crypto');

/**
 * Monitoring and Analytics Service
 * Tracks security metrics, performance metrics, and privacy compliance
 */
class MonitoringService {
  constructor() {
    this.metrics = {
      security: {
        failedAuthentications: 0,
        suspiciousFingerprints: 0,
        unusualPairingPatterns: 0,
        keyRotationCompliance: 0,
        rateLimitViolations: 0
      },
      performance: {
        deviceRegistrations: 0,
        pairingCodeGenerations: 0,
        trustEstablishments: 0,
        keyExchanges: 0,
        averageResponseTime: 0
      },
      privacy: {
        dataRetentionCompliance: 0,
        automaticCleanupSuccess: 0,
        anonymizationEffectiveness: 0,
        zeroKnowledgeVerification: 0
      }
    };
    
    this.events = [];
    this.maxEvents = 10000; // Keep last 10k events
    this.startTime = Date.now();
  }

  /**
   * Track security event
   */
  trackSecurityEvent(eventType, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      type: 'security',
      eventType,
      timestamp: new Date().toISOString(),
      details: this.sanitizeDetails(details)
    };

    this.events.push(event);
    this.updateSecurityMetrics(eventType);
    
    // Log security events
    logger.warn(`Security event: ${eventType}`, details);
    
    // Cleanup old events
    this.cleanupEvents();
  }

  /**
   * Track performance event
   */
  trackPerformanceEvent(eventType, duration = 0, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      type: 'performance',
      eventType,
      timestamp: new Date().toISOString(),
      duration,
      details: this.sanitizeDetails(details)
    };

    this.events.push(event);
    this.updatePerformanceMetrics(eventType, duration);
    
    // Log performance events
    logger.info(`Performance event: ${eventType}`, { duration, ...details });
    
    // Cleanup old events
    this.cleanupEvents();
  }

  /**
   * Track privacy event
   */
  trackPrivacyEvent(eventType, details = {}) {
    const event = {
      id: crypto.randomUUID(),
      type: 'privacy',
      eventType,
      timestamp: new Date().toISOString(),
      details: this.sanitizeDetails(details)
    };

    this.events.push(event);
    this.updatePrivacyMetrics(eventType);
    
    // Log privacy events
    logger.info(`Privacy event: ${eventType}`, details);
    
    // Cleanup old events
    this.cleanupEvents();
  }

  /**
   * Track device registration
   */
  trackDeviceRegistration(deviceId, deviceType, success = true, duration = 0) {
    this.trackPerformanceEvent('device_registration', duration, {
      deviceId: this.hashDeviceId(deviceId),
      deviceType,
      success
    });

    if (success) {
      this.metrics.performance.deviceRegistrations++;
    } else {
      this.trackSecurityEvent('failed_device_registration', {
        deviceId: this.hashDeviceId(deviceId),
        deviceType
      });
    }
  }

  /**
   * Track pairing code generation
   */
  trackPairingCodeGeneration(deviceId, success = true, duration = 0) {
    this.trackPerformanceEvent('pairing_code_generation', duration, {
      deviceId: this.hashDeviceId(deviceId),
      success
    });

    if (success) {
      this.metrics.performance.pairingCodeGenerations++;
    }
  }

  /**
   * Track trust establishment
   */
  trackTrustEstablishment(sourceDeviceId, targetDeviceId, trustLevel, success = true, duration = 0) {
    this.trackPerformanceEvent('trust_establishment', duration, {
      sourceDeviceId: this.hashDeviceId(sourceDeviceId),
      targetDeviceId: this.hashDeviceId(targetDeviceId),
      trustLevel,
      success
    });

    if (success) {
      this.metrics.performance.trustEstablishments++;
    } else {
      this.trackSecurityEvent('failed_trust_establishment', {
        sourceDeviceId: this.hashDeviceId(sourceDeviceId),
        targetDeviceId: this.hashDeviceId(targetDeviceId)
      });
    }
  }

  /**
   * Track key exchange
   */
  trackKeyExchange(sourceDeviceId, targetDeviceId, success = true, duration = 0) {
    this.trackPerformanceEvent('key_exchange', duration, {
      sourceDeviceId: this.hashDeviceId(sourceDeviceId),
      targetDeviceId: this.hashDeviceId(targetDeviceId),
      success
    });

    if (success) {
      this.metrics.performance.keyExchanges++;
    } else {
      this.trackSecurityEvent('failed_key_exchange', {
        sourceDeviceId: this.hashDeviceId(sourceDeviceId),
        targetDeviceId: this.hashDeviceId(targetDeviceId)
      });
    }
  }

  /**
   * Track failed authentication
   */
  trackFailedAuthentication(deviceId, reason, ipAddress) {
    this.trackSecurityEvent('failed_authentication', {
      deviceId: this.hashDeviceId(deviceId),
      reason,
      ipAddress: this.anonymizeIP(ipAddress)
    });

    this.metrics.security.failedAuthentications++;
  }

  /**
   * Track suspicious fingerprint
   */
  trackSuspiciousFingerprint(deviceId, fingerprint, reason) {
    this.trackSecurityEvent('suspicious_fingerprint', {
      deviceId: this.hashDeviceId(deviceId),
      fingerprint: this.hashFingerprint(fingerprint),
      reason
    });

    this.metrics.security.suspiciousFingerprints++;
  }

  /**
   * Track unusual pairing pattern
   */
  trackUnusualPairingPattern(deviceId, pattern, details) {
    this.trackSecurityEvent('unusual_pairing_pattern', {
      deviceId: this.hashDeviceId(deviceId),
      pattern,
      details: this.sanitizeDetails(details)
    });

    this.metrics.security.unusualPairingPatterns++;
  }

  /**
   * Track rate limit violation
   */
  trackRateLimitViolation(action, identifier, ipAddress) {
    this.trackSecurityEvent('rate_limit_violation', {
      action,
      identifier: this.hashIdentifier(identifier),
      ipAddress: this.anonymizeIP(ipAddress)
    });

    this.metrics.security.rateLimitViolations++;
  }

  /**
   * Track key rotation compliance
   */
  trackKeyRotation(deviceId, success = true) {
    this.trackSecurityEvent('key_rotation', {
      deviceId: this.hashDeviceId(deviceId),
      success
    });

    if (success) {
      this.metrics.security.keyRotationCompliance++;
    }
  }

  /**
   * Track data retention compliance
   */
  trackDataRetention(action, recordCount) {
    this.trackPrivacyEvent('data_retention', {
      action,
      recordCount
    });

    this.metrics.privacy.dataRetentionCompliance++;
  }

  /**
   * Track automatic cleanup
   */
  trackAutomaticCleanup(cleanupType, recordsCleaned, success = true) {
    this.trackPrivacyEvent('automatic_cleanup', {
      cleanupType,
      recordsCleaned,
      success
    });

    if (success) {
      this.metrics.privacy.automaticCleanupSuccess++;
    }
  }

  /**
   * Track anonymization effectiveness
   */
  trackAnonymization(dataType, effectiveness) {
    this.trackPrivacyEvent('anonymization', {
      dataType,
      effectiveness
    });

    this.metrics.privacy.anonymizationEffectiveness += effectiveness;
  }

  /**
   * Track zero-knowledge verification
   */
  trackZeroKnowledgeVerification(operation, success = true) {
    this.trackPrivacyEvent('zero_knowledge_verification', {
      operation,
      success
    });

    if (success) {
      this.metrics.privacy.zeroKnowledgeVerification++;
    }
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      metrics: this.metrics,
      events: {
        total: this.events.length,
        security: this.events.filter(e => e.type === 'security').length,
        performance: this.events.filter(e => e.type === 'performance').length,
        privacy: this.events.filter(e => e.type === 'privacy').length
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics() {
    return {
      ...this.metrics.security,
      recentSecurityEvents: this.events
        .filter(e => e.type === 'security')
        .slice(-100) // Last 100 security events
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.metrics.performance,
      recentPerformanceEvents: this.events
        .filter(e => e.type === 'performance')
        .slice(-100) // Last 100 performance events
    };
  }

  /**
   * Get privacy metrics
   */
  getPrivacyMetrics() {
    return {
      ...this.metrics.privacy,
      recentPrivacyEvents: this.events
        .filter(e => e.type === 'privacy')
        .slice(-100) // Last 100 privacy events
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const securityScore = this.calculateSecurityScore();
    const performanceScore = this.calculatePerformanceScore();
    const privacyScore = this.calculatePrivacyScore();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      scores: {
        security: securityScore,
        performance: performanceScore,
        privacy: privacyScore,
        overall: (securityScore + performanceScore + privacyScore) / 3
      },
      alerts: this.getActiveAlerts(),
      uptime: metrics.uptimeFormatted
    };
  }

  // Helper methods

  /**
   * Update security metrics
   */
  updateSecurityMetrics(eventType) {
    // This would update specific security metrics based on event type
    // For now, we'll just increment the general counter
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(eventType, duration) {
    // Update average response time
    const currentAvg = this.metrics.performance.averageResponseTime;
    const totalEvents = this.events.filter(e => e.type === 'performance').length;
    
    this.metrics.performance.averageResponseTime = 
      (currentAvg * (totalEvents - 1) + duration) / totalEvents;
  }

  /**
   * Update privacy metrics
   */
  updatePrivacyMetrics(eventType) {
    // This would update specific privacy metrics based on event type
  }

  /**
   * Sanitize event details
   */
  sanitizeDetails(details) {
    const sanitized = { ...details };
    
    // Remove any potentially sensitive information
    delete sanitized.password;
    delete sanitized.privateKey;
    delete sanitized.secret;
    
    return sanitized;
  }

  /**
   * Hash device ID for privacy
   */
  hashDeviceId(deviceId) {
    return crypto.createHash('sha256').update(deviceId).digest('hex').substring(0, 8);
  }

  /**
   * Hash fingerprint for privacy
   */
  hashFingerprint(fingerprint) {
    return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 8);
  }

  /**
   * Hash identifier for privacy
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier).digest('hex').substring(0, 8);
  }

  /**
   * Anonymize IP address
   */
  anonymizeIP(ip) {
    if (!ip) return 'unknown';
    
    // Remove last octet for IPv4
    if (ip.includes('.')) {
      return ip.split('.').slice(0, 3).join('.') + '.xxx';
    }
    
    // Remove last segment for IPv6
    if (ip.includes(':')) {
      return ip.split(':').slice(0, 7).join(':') + ':xxxx';
    }
    
    return 'unknown';
  }

  /**
   * Cleanup old events
   */
  cleanupEvents() {
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Format uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Calculate security score
   */
  calculateSecurityScore() {
    const total = this.metrics.security.failedAuthentications + 
                  this.metrics.security.suspiciousFingerprints +
                  this.metrics.security.unusualPairingPatterns +
                  this.metrics.security.rateLimitViolations;
    
    if (total === 0) return 100;
    
    const score = Math.max(0, 100 - (total * 2));
    return Math.round(score);
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore() {
    const avgResponseTime = this.metrics.performance.averageResponseTime;
    
    if (avgResponseTime === 0) return 100;
    if (avgResponseTime < 100) return 100;
    if (avgResponseTime < 500) return 90;
    if (avgResponseTime < 1000) return 80;
    if (avgResponseTime < 2000) return 70;
    return 60;
  }

  /**
   * Calculate privacy score
   */
  calculatePrivacyScore() {
    const total = this.metrics.privacy.dataRetentionCompliance +
                  this.metrics.privacy.automaticCleanupSuccess +
                  this.metrics.privacy.zeroKnowledgeVerification;
    
    if (total === 0) return 100;
    
    return Math.min(100, total);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const alerts = [];
    
    if (this.metrics.security.failedAuthentications > 10) {
      alerts.push({
        type: 'security',
        level: 'warning',
        message: 'High number of failed authentications detected'
      });
    }
    
    if (this.metrics.performance.averageResponseTime > 2000) {
      alerts.push({
        type: 'performance',
        level: 'warning',
        message: 'High average response time detected'
      });
    }
    
    return alerts;
  }
}

module.exports = new MonitoringService();
