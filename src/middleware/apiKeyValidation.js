/**
 * API Key Validation Middleware
 * Validates API keys for external frontend consumption
 */

const { errorResponse } = require('./apiResponse');

/**
 * Validate API key middleware
 * Checks for valid API key in headers
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return errorResponse(res, {
      code: 'API_KEY_MISSING',
      message: 'API key required',
      userAction: 'Include X-API-Key header in your request',
      details: {
        requiredHeader: 'X-API-Key',
        example: 'X-API-Key: your-api-key-here',
      },
    }, 401);
  }

  // Basic format validation
  if (typeof apiKey !== 'string' || apiKey.length < 10) {
    return errorResponse(res, {
      code: 'INVALID_API_KEY_FORMAT',
      message: 'Invalid API key format',
      userAction: 'Please provide a valid API key',
      details: {
        providedKey: apiKey ? `***${apiKey.slice(-4)}` : 'none',
        expectedFormat: 'Minimum 10 characters',
      },
    }, 400);
  }

  // TODO: Implement actual API key validation against database
  // For now, we'll do basic validation
  if (!isValidApiKey(apiKey)) {
    return errorResponse(res, {
      code: 'INVALID_API_KEY',
      message: 'Invalid or expired API key',
      userAction: 'Please provide a valid API key or contact support',
      details: {
        providedKey: `***${apiKey.slice(-4)}`,
        reason: 'Key not found or expired',
      },
    }, 401);
  }

  // Add API key info to request for logging/auditing
  req.apiKeyInfo = {
    key: `***${apiKey.slice(-4)}`,
    permissions: getApiKeyPermissions(apiKey), // TODO: Implement
    expiresAt: getApiKeyExpiry(apiKey), // TODO: Implement
  };

  next();
};

/**
 * Validate API key with specific permissions
 * @param {string[]} requiredPermissions - Array of required permissions
 */
const validateApiKeyWithPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    // First validate API key exists
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return errorResponse(res, {
        code: 'API_KEY_MISSING',
        message: 'API key required',
        userAction: 'Include X-API-Key header in your request',
        details: {
          requiredHeader: 'X-API-Key',
          requiredPermissions,
        },
      }, 401);
    }

    // Check if API key has required permissions
    const keyPermissions = getApiKeyPermissions(apiKey); // TODO: Implement
    const missingPermissions = requiredPermissions.filter(
      permission => !keyPermissions.includes(permission),
    );

    if (missingPermissions.length > 0) {
      return errorResponse(res, {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'API key does not have required permissions',
        userAction: 'Contact support to upgrade your API key permissions',
        details: {
          requiredPermissions,
          currentPermissions: keyPermissions,
          missingPermissions,
        },
      }, 403);
    }

    next();
  };
};

/**
 * Optional API key validation - allows requests without API key but logs them
 */
const optionalApiKeyValidation = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    // Validate if provided
    if (!isValidApiKey(apiKey)) {
      return errorResponse(res, {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key provided',
        userAction: 'Please provide a valid API key or omit the header',
        details: {
          providedKey: `***${apiKey.slice(-4)}`,
        },
      }, 401);
    }

    req.apiKeyInfo = {
      key: `***${apiKey.slice(-4)}`,
      permissions: getApiKeyPermissions(apiKey),
      expiresAt: getApiKeyExpiry(apiKey),
    };
  } else {
    // Log unauthenticated request
    req.apiKeyInfo = {
      key: 'none',
      permissions: ['public'],
      expiresAt: null,
    };
  }

  next();
};

/**
 * Check if API key is valid
 * TODO: Implement actual validation against database
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - Whether the key is valid
 */
const isValidApiKey = (apiKey) => {
  // TODO: Replace with actual database validation
  // For now, accept any key that meets basic format requirements

  // Check if key exists in database and is active
  // Check if key hasn't expired
  // Check if key hasn't been revoked

  return true; // Placeholder
};

/**
 * Get API key permissions
 * TODO: Implement actual permission retrieval
 * @param {string} apiKey - The API key
 * @returns {string[]} - Array of permissions
 */
const getApiKeyPermissions = (apiKey) => {
  // TODO: Replace with actual database lookup
  // For now, return default permissions

  // Example permissions:
  // - 'nft-generation': Can generate NFTs
  // - 'device-read': Can read device information
  // - 'device-write': Can modify device information
  // - 'thoughts-read': Can read thoughts
  // - 'thoughts-write': Can create/modify thoughts
  // - 'admin': Full administrative access

  return ['nft-generation', 'device-read', 'thoughts-read'];
};

/**
 * Get API key expiry date
 * TODO: Implement actual expiry retrieval
 * @param {string} apiKey - The API key
 * @returns {Date|null} - Expiry date or null if no expiry
 */
const getApiKeyExpiry = (apiKey) => {
  // TODO: Replace with actual database lookup
  // For now, return null (no expiry)

  return null;
};

/**
 * API key scoping middleware
 * Limits API key access to specific endpoints
 */
const scopeApiKeyToEndpoints = (allowedEndpoints = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return next(); // Allow unauthenticated requests to pass through
    }

    const currentEndpoint = req.path;
    const isAllowed = allowedEndpoints.some(endpoint =>
      currentEndpoint.startsWith(endpoint),
    );

    if (!isAllowed) {
      return errorResponse(res, {
        code: 'ENDPOINT_NOT_ALLOWED',
        message: 'API key does not have access to this endpoint',
        userAction: 'Contact support to request access to this endpoint',
        details: {
          requestedEndpoint: currentEndpoint,
          allowedEndpoints,
          apiKey: `***${apiKey.slice(-4)}`,
        },
      }, 403);
    }

    next();
  };
};

module.exports = {
  validateApiKey,
  validateApiKeyWithPermissions,
  optionalApiKeyValidation,
  scopeApiKeyToEndpoints,
  isValidApiKey,
  getApiKeyPermissions,
  getApiKeyExpiry,
};
