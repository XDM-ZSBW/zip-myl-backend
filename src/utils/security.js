const crypto = require('crypto');
const logger = require('./logger');

class SecurityUtils {
  /**
   * Generate secure random string
   */
  static generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate API key
   */
  static generateApiKey() {
    const prefix = 'ak_';
    const randomPart = crypto.randomBytes(16).toString('hex');
    return `${prefix}${randomPart}`;
  }

  /**
   * Hash data using SHA-256
   */
  static hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate device fingerprint
   */
  static generateDeviceFingerprint(userAgent, acceptLanguage, acceptEncoding, connection, ip) {
    const fingerprintData = `${userAgent}-${acceptLanguage}-${acceptEncoding}-${connection}-${ip}`;
    return this.hashData(fingerprintData);
  }

  /**
   * Validate API key format
   */
  static validateApiKeyFormat(apiKey) {
    const apiKeyRegex = /^ak_[a-f0-9]{32}$/;
    return apiKeyRegex.test(apiKey);
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize string to prevent XSS
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .trim();
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if IP is in allowed range
   */
  static isIPAllowed(ip, allowedIPs) {
    if (!allowedIPs || allowedIPs.length === 0) return true;
    
    return allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation
        return this.isIPInCIDR(ip, allowedIP);
      } else {
        // Exact match
        return ip === allowedIP;
      }
    });
  }

  /**
   * Check if IP is in CIDR range
   */
  static isIPInCIDR(ip, cidr) {
    try {
      const [network, prefixLength] = cidr.split('/');
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
      
      return (ipNum & mask) === (networkNum & mask);
    } catch (error) {
      logger.error('Error checking CIDR range', { error: error.message, ip, cidr });
      return false;
    }
  }

  /**
   * Convert IP address to number
   */
  static ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Verify CSRF token
   */
  static verifyCSRFToken(token, sessionToken) {
    if (!token || !sessionToken) return false;
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(sessionToken));
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    
    return {
      score,
      strength: score < 3 ? 'weak' : score < 5 ? 'medium' : 'strong',
      checks
    };
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Rate limit key generator
   */
  static generateRateLimitKey(type, identifier) {
    return `${type}:${identifier}`;
  }

  /**
   * Validate rate limit configuration
   */
  static validateRateLimitConfig(config) {
    const { windowMs, max, message } = config;
    
    if (!windowMs || typeof windowMs !== 'number' || windowMs <= 0) {
      throw new Error('Invalid windowMs: must be a positive number');
    }
    
    if (!max || typeof max !== 'number' || max <= 0) {
      throw new Error('Invalid max: must be a positive number');
    }
    
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message: must be an object');
    }
    
    return true;
  }

  /**
   * Check if request is suspicious
   */
  static isSuspiciousRequest(req) {
    const suspiciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS attempts
      /union.*select/i, // SQL injection
      /javascript:/i, // JavaScript protocol
      /on\w+\s*=/i, // Event handlers
      /eval\s*\(/i, // Code injection
      /exec\s*\(/i, // Command injection
    ];

    const checkString = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers
    });

    return suspiciousPatterns.some(pattern => pattern.test(checkString));
  }

  /**
   * Log security event
   */
  static logSecurityEvent(event, req, details = {}) {
    logger.warn('Security event detected', {
      event,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      deviceId: req.deviceId,
      apiKeyId: req.apiKey?.id,
      ...details
    });
  }

  /**
   * Generate audit log entry
   */
  static generateAuditLog(action, req, success = true, errorCode = null, metadata = {}) {
    return {
      action,
      deviceId: req.deviceId,
      apiKeyId: req.apiKey?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success,
      errorCode,
      metadata: {
        path: req.path,
        method: req.method,
        ...metadata
      }
    };
  }
}

module.exports = SecurityUtils;
