const logger = require('../utils/logger');

/**
 * Extension Validation Middleware
 * Validates extension identity and permissions for all extension requests
 */

// Valid extension ID patterns
const EXTENSION_ID_PATTERNS = {
  chrome: /^[a-p]{32}$/, // Chrome extension ID format
  firefox: /^[a-f0-9]{32}$/, // Firefox extension ID format
  edge: /^[a-p]{32}$/, // Edge extension ID format
  safari: /^[a-f0-9]{32}$/, // Safari extension ID format
};

// Trusted extension IDs (for bypassing certain restrictions)
const TRUSTED_EXTENSIONS = process.env.TRUSTED_EXTENSION_IDS ?
  process.env.TRUSTED_EXTENSION_IDS.split(',') : [];

/**
 * Validate extension ID format
 * @param {string} extensionId - The extension ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateExtensionId = (extensionId) => {
  if (!extensionId) return false;

  // Check against all known patterns
  for (const pattern of Object.values(EXTENSION_ID_PATTERNS)) {
    if (pattern.test(extensionId)) {
      return true;
    }
  }

  return false;
};

/**
 * Detect extension type from ID
 * @param {string} extensionId - The extension ID
 * @returns {string} - Extension type (chrome, firefox, edge, safari, unknown)
 */
const detectExtensionType = (extensionId) => {
  if (!extensionId) return 'unknown';

  if (EXTENSION_ID_PATTERNS.chrome.test(extensionId)) return 'chrome';
  if (EXTENSION_ID_PATTERNS.firefox.test(extensionId)) return 'firefox';
  if (EXTENSION_ID_PATTERNS.edge.test(extensionId)) return 'edge';
  if (EXTENSION_ID_PATTERNS.safari.test(extensionId)) return 'safari';

  return 'unknown';
};

/**
 * Check if extension is trusted
 * @param {string} extensionId - The extension ID
 * @returns {boolean} - True if trusted, false otherwise
 */
const isTrustedExtension = (extensionId) => {
  return TRUSTED_EXTENSIONS.includes(extensionId);
};

/**
 * Main extension validation middleware
 */
const validateExtension = (req, res, next) => {
  const extensionId = req.headers['x-extension-id'];
  const extensionVersion = req.headers['x-extension-version'];
  const clientType = req.headers['x-client-type'] || 'chrome-extension';

  // Log extension request
  logger.info('Extension request received', {
    extensionId,
    extensionVersion,
    clientType,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Check if extension ID is required for this endpoint
  const requiresExtensionId = shouldRequireExtensionId(req.path);

  if (requiresExtensionId && !extensionId) {
    logger.warn('Extension ID required but not provided', {
      path: req.path,
      ip: req.ip,
    });

    return res.status(401).json({
      success: false,
      error: 'Extension ID required',
      code: 'MISSING_EXTENSION_ID',
      required: true,
      path: req.path,
    });
  }

  // If extension ID is provided, validate it
  if (extensionId) {
    if (!validateExtensionId(extensionId)) {
      logger.warn('Invalid extension ID format', {
        extensionId,
        path: req.path,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid extension ID format',
        code: 'INVALID_EXTENSION_ID',
        provided: extensionId,
        expectedFormat: '32-character alphanumeric string',
      });
    }

    // Detect extension type
    const extensionType = detectExtensionType(extensionId);

    // Add extension information to request object
    req.extensionId = extensionId;
    req.extensionVersion = extensionVersion;
    req.extensionType = extensionType;
    req.clientType = clientType;
    req.isTrustedExtension = isTrustedExtension(extensionId);

    // Log successful validation
    logger.info('Extension validation successful', {
      extensionId,
      extensionType,
      extensionVersion,
      isTrusted: req.isTrustedExtension,
      path: req.path,
    });
  }

  next();
};

/**
 * Determine if an endpoint requires extension ID
 * @param {string} path - Request path
 * @returns {boolean} - True if extension ID is required
 */
const shouldRequireExtensionId = (path) => {
  // Endpoints that always require extension ID
  const requiredEndpoints = [
    '/api/v1/device-registration',
    '/api/v1/pairing-codes',
    '/api/v1/nft',
    '/api/v1/encrypted',
  ];

  // Endpoints that don't require extension ID
  const optionalEndpoints = [
    '/health',
    '/api/v1/health',
    '/docs',
    '/api/docs',
  ];

  // Check if path matches required endpoints
  for (const endpoint of requiredEndpoints) {
    if (path.startsWith(endpoint)) {
      return true;
    }
  }

  // Check if path matches optional endpoints
  for (const endpoint of optionalEndpoints) {
    if (path.startsWith(endpoint)) {
      return false;
    }
  }

  // Default to requiring extension ID for API endpoints
  return path.startsWith('/api/');
};

/**
 * Extension permission checker middleware
 * @param {string[]} requiredPermissions - Array of required permissions
 */
const requireExtensionPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.extensionId) {
      return res.status(401).json({
        success: false,
        error: 'Extension ID required for permission check',
        code: 'MISSING_EXTENSION_ID',
      });
    }

    // Trusted extensions bypass permission checks
    if (req.isTrustedExtension) {
      logger.info('Permission check bypassed for trusted extension', {
        extensionId: req.extensionId,
        permissions: requiredPermissions,
      });
      return next();
    }

    // For now, all extensions have basic permissions
    // In the future, this could check against a permission database
    const hasPermissions = true;

    if (!hasPermissions) {
      logger.warn('Extension lacks required permissions', {
        extensionId: req.extensionId,
        required: requiredPermissions,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Extension rate limit bypass for trusted extensions
 */
const bypassRateLimitForTrusted = (req, res, next) => {
  if (req.isTrustedExtension) {
    req.bypassRateLimit = true;
    logger.info('Rate limit bypassed for trusted extension', {
      extensionId: req.extensionId,
    });
  }
  next();
};

module.exports = {
  validateExtension,
  requireExtensionPermissions,
  bypassRateLimitForTrusted,
  validateExtensionId,
  detectExtensionType,
  isTrustedExtension,
};
