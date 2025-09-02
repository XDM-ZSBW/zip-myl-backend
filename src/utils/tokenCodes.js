/**
 * Token Code Generator for MyL.Zip
 * Generates secure, traceable token codes for API operations
 */

const crypto = require('crypto');

/**
 * Generate a secure token code for tracking operations
 * @param {string} operation - The operation being performed
 * @param {string} context - Additional context for the operation
 * @returns {string} A secure token code
 */
function generateTokenCode(operation, context = '') {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex');
  const operationHash = crypto.createHash('sha256')
    .update(`${operation}${context}${timestamp}`)
    .digest('hex')
    .substring(0, 8);

  return `${operation}_${timestamp}_${random}_${operationHash}`;
}

/**
 * Validate a token code format
 * @param {string} tokenCode - The token code to validate
 * @returns {boolean} True if valid format
 */
function validateTokenCode(tokenCode) {
  if (!tokenCode || typeof tokenCode !== 'string') {
    return false;
  }

  const parts = tokenCode.split('_');
  return parts.length === 4 &&
         parts[0].length > 0 &&
         parts[1].length > 0 &&
         parts[2].length > 0 &&
         parts[3].length > 0;
}

/**
 * Extract information from a token code
 * @param {string} tokenCode - The token code to parse
 * @returns {Object} Parsed token information
 */
function parseTokenCode(tokenCode) {
  if (!validateTokenCode(tokenCode)) {
    return null;
  }

  const parts = tokenCode.split('_');
  return {
    operation: parts[0],
    timestamp: parseInt(parts[1], 10),
    random: parts[2],
    hash: parts[3],
    age: Date.now() - parseInt(parts[1], 10),
  };
}

/**
 * Generate a simple operation token
 * @param {string} operation - The operation name
 * @returns {string} A simple token code
 */
function generateSimpleToken(operation) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${operation}_${timestamp}_${random}`;
}

module.exports = {
  generateTokenCode,
  validateTokenCode,
  parseTokenCode,
  generateSimpleToken,
};

