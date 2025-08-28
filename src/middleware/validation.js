const Joi = require('joi');
const { logger } = require('../utils/logger');

/**
 * Generic validation middleware
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Validation error', {
        path: req.path,
        method: req.method,
        errors: errorDetails,
        ip: req.ip,
      });

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Invalid input data',
        details: errorDetails,
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Validate request size
 */
const validateRequestSize = (maxSize = '1mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxSizeBytes = parseSize(maxSize);

    if (contentLength > maxSizeBytes) {
      logger.warn('Request size exceeded', {
        contentLength,
        maxSize: maxSizeBytes,
        path: req.path,
        ip: req.ip,
      });

      return res.status(413).json({
        success: false,
        error: 'Request too large',
        message: `Request size exceeds maximum allowed size of ${maxSize}`,
      });
    }

    next();
  };
};

/**
 * Parse size string to bytes
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 1024 * 1024; // Default 1MB

  const [, value, unit] = match;
  return parseFloat(value) * (units[unit] || 1);
};

/**
 * Validate UUID format
 */
const validateUUID = (field = 'id') => {
  return (req, res, next) => {
    const uuid = req.params[field];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuid && !uuidRegex.test(uuid)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid UUID',
        message: `Invalid UUID format for ${field}`,
      });
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pagination',
      message: 'Page must be greater than 0',
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid pagination',
      message: 'Limit must be between 1 and 100',
    });
  }

  req.pagination = { page, limit };
  next();
};

/**
 * Validate batch operations
 */
const validateBatchOperations = (req, res, next) => {
  try {
    const { operations, options = {} } = req.body;

    // Check if operations array exists
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid batch operations',
        message: 'Operations must be an array',
      });
    }

    // Check batch size limits
    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty batch operations',
        message: 'At least one operation is required',
      });
    }

    if (operations.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Batch too large',
        message: 'Maximum 50 operations per batch',
      });
    }

    // Validate each operation
    const validationErrors = [];
    operations.forEach((operation, index) => {
      if (!operation || typeof operation !== 'object') {
        validationErrors.push(`Operation ${index}: Invalid operation object`);
        return;
      }

      if (!operation.operation || typeof operation.operation !== 'string') {
        validationErrors.push(`Operation ${index}: Missing or invalid operation type`);
      }

      // Check for required fields based on operation type
      const requiredFields = getRequiredFieldsForOperation(operation.operation);
      if (requiredFields) {
        requiredFields.forEach(field => {
          if (!operation[field]) {
            validationErrors.push(`Operation ${index}: Missing required field '${field}' for operation '${operation.operation}'`);
          }
        });
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Batch validation failed',
        validationErrors,
        message: 'Please fix validation errors before proceeding',
      });
    }

    // Validate options
    if (options.maxConcurrency && (typeof options.maxConcurrency !== 'number' || options.maxConcurrency < 1 || options.maxConcurrency > 20)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid options',
        message: 'maxConcurrency must be a number between 1 and 20',
      });
    }

    if (options.timeout && (typeof options.timeout !== 'number' || options.timeout < 1000 || options.timeout > 300000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid options',
        message: 'timeout must be a number between 1000 and 300000 milliseconds',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Batch validation error',
      message: error.message,
    });
  }
};

/**
 * Get required fields for a specific operation type
 */
function getRequiredFieldsForOperation(operationType) {
  const requiredFieldsMap = {
    'pairing-code.generate': ['deviceId'],
    'device.register': ['deviceId', 'deviceInfo'],
    'nft.generate': ['style', 'deviceId'],
    'thoughts.sync': ['thoughts'],
    'trust.establish': ['trustData'],
  };

  return requiredFieldsMap[operationType] || null;
}

// Validation schemas
const schemas = {
  // Device registration
  deviceRegistration: Joi.object({
    // No body required for device registration
  }),

  // Login/Refresh token
  tokenRequest: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.empty': 'Refresh token is required',
      'any.required': 'Refresh token is required',
    }),
  }),

  // Device update
  deviceUpdate: Joi.object({
    userAgent: Joi.string().max(500).optional(),
    // Add other updatable fields as needed
  }),

  // API key creation
  apiKeyCreation: Joi.object({
    clientId: Joi.string().uuid().required().messages({
      'string.guid': 'Client ID must be a valid UUID',
      'any.required': 'Client ID is required',
    }),
    permissions: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': 'At least one permission is required',
      'any.required': 'Permissions array is required',
    }),
    rateLimit: Joi.number().integer().min(1).max(10000).optional(),
    expiresAt: Joi.date().greater('now').optional(),
  }),

  // API key update
  apiKeyUpdate: Joi.object({
    permissions: Joi.array().items(Joi.string()).min(1).optional(),
    rateLimit: Joi.number().integer().min(1).max(10000).optional(),
    isActive: Joi.boolean().optional(),
    expiresAt: Joi.date().greater('now').optional().allow(null),
  }),

  // Client creation
  clientCreation: Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.empty': 'Client name is required',
      'string.min': 'Client name must be at least 1 character',
      'string.max': 'Client name must not exceed 100 characters',
      'any.required': 'Client name is required',
    }),
    clientType: Joi.string().valid('web', 'mobile', 'desktop', 'service').required().messages({
      'any.only': 'Client type must be one of: web, mobile, desktop, service',
      'any.required': 'Client type is required',
    }),
  }),

  // Query parameters for listing
  listQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    isActive: Joi.boolean().optional(),
    clientId: Joi.string().uuid().optional(),
    clientType: Joi.string().valid('web', 'mobile', 'desktop', 'service').optional(),
    action: Joi.string().optional(),
    success: Joi.boolean().optional(),
    deviceId: Joi.string().uuid().optional(),
    apiKeyId: Joi.string().uuid().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
  }),

  // Thought schemas
  id: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  createThought: Joi.object({
    content: Joi.string().min(1).max(10000).required(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    isPublic: Joi.boolean().optional().default(false),
    metadata: Joi.object().optional(),
  }),

  updateThought: Joi.object({
    content: Joi.string().min(1).max(10000).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
    isPublic: Joi.boolean().optional(),
    metadata: Joi.object().optional(),
  }),

  // NFT schemas
  nftGeneratePairing: Joi.object({
    platform: Joi.string().max(50).required(),
    collectionName: Joi.string().max(255).optional(),
  }),

  nftValidatePairing: Joi.object({
    token: Joi.string().max(255).required(),
    nftData: Joi.object().required(),
  }),

  nftProfileCollection: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    platform: Joi.string().max(50).optional(),
  }),

  nftStoreInvalid: Joi.object({
    nftData: Joi.object().required(),
    reason: Joi.string().max(255).required(),
    platform: Joi.string().max(50).optional(),
  }),

  nftProfilePicture: Joi.object({
    imageData: Joi.string().max(10485760).required(), // 10MB base64
    imageFormat: Joi.string().valid('jpeg', 'png', 'gif').default('jpeg'),
  }),
};

module.exports = {
  validate,
  sanitizeInput,
  validateRequestSize,
  validateUUID,
  validatePagination,
  validateBatchOperations,
  schemas,
};
