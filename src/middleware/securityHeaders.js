const { logger } = require('../utils/logger');

/**
 * Security Headers Middleware
 * Implements comprehensive security headers for production
 */
const securityHeaders = (req, res, next) => {
  try {
    // Content Security Policy
    if (process.env.CSP_ENABLED === 'true') {
      const cspPolicy = process.env.CSP_POLICY || 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'";
      
      res.setHeader('Content-Security-Policy', cspPolicy);
    }

    // HTTP Strict Transport Security
    if (process.env.SECURITY_HEADERS === 'true') {
      const hstsMaxAge = process.env.HSTS_MAX_AGE || '31536000';
      res.setHeader('Strict-Transport-Security', `max-age=${hstsMaxAge}; includeSubDomains; preload`);
    }

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader('Permissions-Policy', 
      'geolocation=(), ' +
      'microphone=(), ' +
      'camera=(), ' +
      'payment=(), ' +
      'usb=(), ' +
      'magnetometer=(), ' +
      'gyroscope=(), ' +
      'speaker=(), ' +
      'vibrate=(), ' +
      'fullscreen=(self), ' +
      'sync-xhr=()'
    );

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // Cross-Origin-Embedder-Policy
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin-Opener-Policy
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');

    // Add custom security headers
    res.setHeader('X-Security-Headers', 'enabled');
    res.setHeader('X-Content-Security', 'encrypted');

    next();
  } catch (error) {
    logger.error('Error setting security headers:', error);
    next();
  }
};

module.exports = securityHeaders;
