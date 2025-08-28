const crypto = require('crypto');

/**
 * Validation utilities for device registration and trust management
 */

/**
 * Validate device registration data
 */
const validateDeviceRegistration = (data) => {
  const errors = [];

  // Required fields
  if (!data.deviceId) {
    errors.push('deviceId is required');
  } else if (!isValidUUID(data.deviceId)) {
    errors.push('deviceId must be a valid UUID');
  }

  if (!data.deviceInfo) {
    errors.push('deviceInfo is required');
  } else {
    const deviceInfoErrors = validateDeviceInfo(data.deviceInfo);
    errors.push(...deviceInfoErrors);
  }

  if (!data.publicKey) {
    errors.push('publicKey is required');
  } else if (!isValidPublicKey(data.publicKey)) {
    errors.push('publicKey must be a valid RSA public key in PEM format');
  }

  if (!data.encryptedMetadata) {
    errors.push('encryptedMetadata is required');
  } else if (!isValidBase64(data.encryptedMetadata)) {
    errors.push('encryptedMetadata must be valid base64 encoded data');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate device information
 */
const validateDeviceInfo = (deviceInfo) => {
  const errors = [];

  if (!deviceInfo.type) {
    errors.push('deviceInfo.type is required');
  } else if (!isValidDeviceType(deviceInfo.type)) {
    errors.push('deviceInfo.type must be a valid device type');
  }

  if (!deviceInfo.version) {
    errors.push('deviceInfo.version is required');
  } else if (!isValidVersion(deviceInfo.version)) {
    errors.push('deviceInfo.version must be a valid semantic version');
  }

  if (!deviceInfo.fingerprint) {
    errors.push('deviceInfo.fingerprint is required');
  } else if (!isValidFingerprint(deviceInfo.fingerprint)) {
    errors.push('deviceInfo.fingerprint must be a valid SHA-256 hash');
  }

  if (deviceInfo.capabilities && !Array.isArray(deviceInfo.capabilities)) {
    errors.push('deviceInfo.capabilities must be an array');
  }

  return errors;
};

/**
 * Validate pairing code data
 */
const validatePairingCode = (data) => {
  const errors = [];

  if (!data.deviceId) {
    errors.push('deviceId is required');
  } else if (!isValidUUID(data.deviceId)) {
    errors.push('deviceId must be a valid UUID');
  }

  if (!data.pairingCode) {
    errors.push('pairingCode is required');
  } else if (!isValidPairingCode(data.pairingCode)) {
    errors.push('pairingCode must be a 6-digit numeric code');
  }

  if (!data.encryptedTrustData) {
    errors.push('encryptedTrustData is required');
  } else if (!isValidBase64(data.encryptedTrustData)) {
    errors.push('encryptedTrustData must be valid base64 encoded data');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate key exchange data
 */
const validateKeyExchange = (data) => {
  const errors = [];

  if (!data.deviceId) {
    errors.push('deviceId is required');
  } else if (!isValidUUID(data.deviceId)) {
    errors.push('deviceId must be a valid UUID');
  }

  if (!data.targetDeviceId) {
    errors.push('targetDeviceId is required');
  } else if (!isValidUUID(data.targetDeviceId)) {
    errors.push('targetDeviceId must be a valid UUID');
  }

  if (!data.encryptedKeyData) {
    errors.push('encryptedKeyData is required');
  } else if (!isValidBase64(data.encryptedKeyData)) {
    errors.push('encryptedKeyData must be valid base64 encoded data');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate trust establishment data
 */
const validateTrustEstablishment = (data) => {
  const errors = [];

  if (!data.sourceDeviceId) {
    errors.push('sourceDeviceId is required');
  } else if (!isValidUUID(data.sourceDeviceId)) {
    errors.push('sourceDeviceId must be a valid UUID');
  }

  if (!data.targetDeviceId) {
    errors.push('targetDeviceId is required');
  } else if (!isValidUUID(data.targetDeviceId)) {
    errors.push('targetDeviceId must be a valid UUID');
  }

  if (data.trustLevel && !isValidTrustLevel(data.trustLevel)) {
    errors.push('trustLevel must be 1, 2, or 3');
  }

  if (!data.encryptedTrustData) {
    errors.push('encryptedTrustData is required');
  } else if (!isValidBase64(data.encryptedTrustData)) {
    errors.push('encryptedTrustData must be valid base64 encoded data');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Helper validation functions

/**
 * Check if string is a valid UUID
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if string is a valid device type
 */
function isValidDeviceType(type) {
  const validTypes = [
    'chrome-extension',
    'obsidian-plugin',
    'vscode-extension',
    'mobile-app',
    'desktop-app',
    'web-app',
    'api-client',
  ];
  return validTypes.includes(type);
}

/**
 * Check if string is a valid semantic version
 */
function isValidVersion(version) {
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
  return versionRegex.test(version);
}

/**
 * Check if string is a valid SHA-256 fingerprint
 */
function isValidFingerprint(fingerprint) {
  return typeof fingerprint === 'string' &&
         fingerprint.length === 64 &&
         /^[a-f0-9]+$/i.test(fingerprint);
}

/**
 * Check if string is a valid RSA public key in PEM format
 */
function isValidPublicKey(publicKey) {
  try {
    // Basic PEM format validation
    return publicKey.includes('-----BEGIN PUBLIC KEY-----') &&
           publicKey.includes('-----END PUBLIC KEY-----') &&
           publicKey.length > 100; // Minimum reasonable key length
  } catch (error) {
    return false;
  }
}

/**
 * Check if string is valid base64
 */
function isValidBase64(str) {
  try {
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (error) {
    return false;
  }
}

/**
 * Check if string is a valid pairing code (supports both UUID and short format)
 */
function isValidPairingCode(code) {
  if (typeof code !== 'string') {
    return false;
  }

  // Check for UUID format
  if (isValidUUID(code)) {
    return true;
  }

  // Check for short format (12-character hex)
  if (code.length === 12 && /^[0-9a-f]{12}$/i.test(code)) {
    return true;
  }

  // Legacy 6-digit numeric format (for backward compatibility)
  if (code.length === 6 && /^\d{6}$/.test(code)) {
    return true;
  }

  return false;
}

/**
 * Check if string is a valid UUID format pairing code
 */
function isValidUUIDPairingCode(code) {
  return isValidUUID(code);
}

/**
 * Check if string is a valid short format pairing code
 */
function isValidShortPairingCode(code) {
  return typeof code === 'string' &&
         code.length === 12 &&
         /^[0-9a-f]{12}$/i.test(code);
}

/**
 * Check if string is a valid legacy numeric pairing code
 */
function isValidLegacyPairingCode(code) {
  return typeof code === 'string' &&
         code.length === 6 &&
         /^\d{6}$/.test(code);
}

/**
 * Detect pairing code format
 */
function detectPairingCodeFormat(code) {
  if (isValidUUID(code)) {
    return 'uuid';
  } else if (isValidShortPairingCode(code)) {
    return 'short';
  } else if (isValidLegacyPairingCode(code)) {
    return 'legacy';
  } else {
    return 'unknown';
  }
}

/**
 * Check if trust level is valid
 */
function isValidTrustLevel(level) {
  return [1, 2, 3].includes(parseInt(level));
}

/**
 * Sanitize input string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Validate IP address
 */
function isValidIPAddress(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate user agent string
 */
function isValidUserAgent(userAgent) {
  if (typeof userAgent !== 'string') {
    return false;
  }

  // Basic validation - should contain browser info
  return userAgent.length > 10 &&
         userAgent.length < 1000 &&
         !userAgent.includes('<script>') &&
         !userAgent.includes('javascript:');
}

/**
 * Validate device capabilities
 */
function validateCapabilities(capabilities) {
  if (!Array.isArray(capabilities)) {
    return false;
  }

  const validCapabilities = [
    'encryption',
    'sync',
    'storage',
    'notifications',
    'offline',
    'cross-device',
    'biometric',
    'hardware-security',
  ];

  return capabilities.every(cap => validCapabilities.includes(cap));
}

/**
 * Rate limiting validation
 */
function validateRateLimit(identifier, action, limits) {
  // This would typically check against Redis or similar
  // For now, return a basic validation
  return {
    allowed: true,
    remaining: limits[action] || 10,
    resetTime: Date.now() + 3600000, // 1 hour
  };
}

module.exports = {
  validateDeviceRegistration,
  validateDeviceInfo,
  validatePairingCode,
  validateKeyExchange,
  validateTrustEstablishment,
  isValidUUID,
  isValidDeviceType,
  isValidVersion,
  isValidFingerprint,
  isValidPublicKey,
  isValidBase64,
  isValidPairingCode,
  isValidUUIDPairingCode,
  isValidShortPairingCode,
  isValidLegacyPairingCode,
  detectPairingCodeFormat,
  isValidTrustLevel,
  sanitizeInput,
  isValidIPAddress,
  isValidUserAgent,
  validateCapabilities,
  validateRateLimit,
};
