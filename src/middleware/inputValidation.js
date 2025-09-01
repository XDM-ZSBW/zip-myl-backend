/**
 * Input Validation Middleware
 * Comprehensive validation for API inputs
 */

const { errorResponse } = require('./apiResponse');

/**
 * Validate NFT generation input
 */
const validateNFTGeneration = (req, res, next) => {
  const { format, deviceId, preferences } = req.body;

  // Validate format
  if (!format || !['uuid', 'short', 'legacy'].includes(format)) {
    return errorResponse(res, {
      code: 'INVALID_FORMAT',
      message: 'Invalid pairing code format',
      userAction: 'Use one of: uuid, short, legacy',
      details: {
        providedFormat: format,
        allowedFormats: ['uuid', 'short', 'legacy'],
      },
    }, 400);
  }

  // Validate device ID
  if (!deviceId) {
    return errorResponse(res, {
      code: 'DEVICE_ID_MISSING',
      message: 'Device ID is required',
      userAction: 'Include deviceId in request body',
      details: {
        requiredField: 'deviceId',
        example: { deviceId: 'dev_123456789' },
      },
    }, 400);
  }

  // Validate device ID format
  if (typeof deviceId !== 'string' || !deviceId.startsWith('dev_')) {
    return errorResponse(res, {
      code: 'INVALID_DEVICE_ID_FORMAT',
      message: 'Invalid device ID format',
      userAction: 'Provide a valid device ID starting with "dev_"',
      details: {
        providedDeviceId: deviceId,
        expectedFormat: 'dev_ followed by alphanumeric characters',
      },
    }, 400);
  }

  // Validate preferences if provided
  if (preferences) {
    if (typeof preferences !== 'object') {
      return errorResponse(res, {
        code: 'INVALID_PREFERENCES_FORMAT',
        message: 'Preferences must be an object',
        userAction: 'Provide preferences as a JSON object',
        details: {
          providedPreferences: preferences,
          expectedType: 'object',
        },
      }, 400);
    }

    // Validate geometric shapes if provided
    if (preferences.geometricShapes) {
      if (!Array.isArray(preferences.geometricShapes)) {
        return errorResponse(res, {
          code: 'INVALID_GEOMETRIC_SHAPES',
          message: 'Geometric shapes must be an array',
          userAction: 'Provide geometric shapes as an array of numbers',
          details: {
            providedShapes: preferences.geometricShapes,
            expectedType: 'array',
          },
        }, 400);
      }

      const validShapes = [3, 4, 5, 6, 8, 10, 12];
      const invalidShapes = preferences.geometricShapes.filter(
        shape => !validShapes.includes(shape),
      );

      if (invalidShapes.length > 0) {
        return errorResponse(res, {
          code: 'INVALID_GEOMETRIC_SHAPE_VALUES',
          message: 'Invalid geometric shape values',
          userAction: 'Use only valid geometric shapes: 3, 4, 5, 6, 8, 10, 12',
          details: {
            invalidShapes,
            validShapes,
            providedShapes: preferences.geometricShapes,
          },
        }, 400);
      }
    }

    // Validate color scheme if provided
    if (preferences.colorScheme) {
      const validColorSchemes = ['gradient', 'monochrome', 'complementary', 'analogous'];
      if (!validColorSchemes.includes(preferences.colorScheme)) {
        return errorResponse(res, {
          code: 'INVALID_COLOR_SCHEME',
          message: 'Invalid color scheme',
          userAction: 'Use one of: gradient, monochrome, complementary, analogous',
          details: {
            providedScheme: preferences.colorScheme,
            validSchemes: validColorSchemes,
          },
        }, 400);
      }
    }

    // Validate pattern type if provided
    if (preferences.patternType) {
      const validPatternTypes = ['geometric', 'organic', 'abstract', 'minimal'];
      if (!validPatternTypes.includes(preferences.patternType)) {
        return errorResponse(res, {
          code: 'INVALID_PATTERN_TYPE',
          message: 'Invalid pattern type',
          userAction: 'Use one of: geometric, organic, abstract, minimal',
          details: {
            providedPattern: preferences.patternType,
            validPatterns: validPatternTypes,
          },
        }, 400);
      }
    }
  }

  next();
};

/**
 * Validate device registration input
 */
const validateDeviceRegistration = (req, res, next) => {
  const { deviceData } = req.body;

  if (!deviceData) {
    return errorResponse(res, {
      code: 'DEVICE_DATA_MISSING',
      message: 'Device data is required',
      userAction: 'Include deviceData in request body',
      details: {
        requiredField: 'deviceData',
        example: { deviceData: { platform: 'chrome-extension', version: '1.0.0' } },
      },
    }, 400);
  }

  if (typeof deviceData !== 'object') {
    return errorResponse(res, {
      code: 'INVALID_DEVICE_DATA_FORMAT',
      message: 'Device data must be an object',
      userAction: 'Provide device data as a JSON object',
      details: {
        providedData: deviceData,
        expectedType: 'object',
      },
    }, 400);
  }

  const { platform, version, userAgent, capabilities } = deviceData;

  // Validate platform
  if (!platform) {
    return errorResponse(res, {
      code: 'PLATFORM_MISSING',
      message: 'Platform is required',
      userAction: 'Include platform in device data',
      details: {
        requiredField: 'platform',
        example: 'chrome-extension',
      },
    }, 400);
  }

  if (typeof platform !== 'string') {
    return errorResponse(res, {
      code: 'INVALID_PLATFORM_FORMAT',
      message: 'Platform must be a string',
      userAction: 'Provide platform as a string',
      details: {
        providedPlatform: platform,
        expectedType: 'string',
      },
    }, 400);
  }

  // Validate version
  if (!version) {
    return errorResponse(res, {
      code: 'VERSION_MISSING',
      message: 'Version is required',
      userAction: 'Include version in device data',
      details: {
        requiredField: 'version',
        example: '1.0.0',
      },
    }, 400);
  }

  if (typeof version !== 'string') {
    return errorResponse(res, {
      code: 'INVALID_VERSION_FORMAT',
      message: 'Version must be a string',
      userAction: 'Provide version as a string',
      details: {
        providedVersion: version,
        expectedType: 'string',
      },
    }, 400);
  }

  // Validate user agent
  if (userAgent && typeof userAgent !== 'string') {
    return errorResponse(res, {
      code: 'INVALID_USER_AGENT_FORMAT',
      message: 'User agent must be a string',
      userAction: 'Provide user agent as a string',
      details: {
        providedUserAgent: userAgent,
        expectedType: 'string',
      },
    }, 400);
  }

  // Validate capabilities if provided
  if (capabilities) {
    if (!Array.isArray(capabilities)) {
      return errorResponse(res, {
        code: 'INVALID_CAPABILITIES_FORMAT',
        message: 'Capabilities must be an array',
        userAction: 'Provide capabilities as an array of strings',
        details: {
          providedCapabilities: capabilities,
          expectedType: 'array',
        },
      }, 400);
    }

    const validCapabilities = [
      'nft-generation',
      'device-trust',
      'thoughts-read',
      'thoughts-write',
      'admin',
    ];

    const invalidCapabilities = capabilities.filter(
      cap => !validCapabilities.includes(cap),
    );

    if (invalidCapabilities.length > 0) {
      return errorResponse(res, {
        code: 'INVALID_CAPABILITIES',
        message: 'Invalid capabilities specified',
        userAction: 'Use only valid capabilities',
        details: {
          invalidCapabilities,
          validCapabilities,
          providedCapabilities: capabilities,
        },
      }, 400);
    }
  }

  next();
};

/**
 * Validate thoughts input
 */
const validateThoughtsInput = (req, res, next) => {
  const { content, metadata, encryption } = req.body;

  // Validate content
  if (!content) {
    return errorResponse(res, {
      code: 'CONTENT_MISSING',
      message: 'Thought content is required',
      userAction: 'Include content in request body',
      details: {
        requiredField: 'content',
        example: { content: 'Your encrypted thought here' },
      },
    }, 400);
  }

  if (typeof content !== 'string') {
    return errorResponse(res, {
      code: 'INVALID_CONTENT_FORMAT',
      message: 'Content must be a string',
      userAction: 'Provide content as a string',
      details: {
        providedContent: content,
        expectedType: 'string',
      },
    }, 400);
  }

  if (content.length < 1 || content.length > 10000) {
    return errorResponse(res, {
      code: 'INVALID_CONTENT_LENGTH',
      message: 'Content length must be between 1 and 10,000 characters',
      userAction: 'Provide content with appropriate length',
      details: {
        contentLength: content.length,
        minLength: 1,
        maxLength: 10000,
      },
    }, 400);
  }

  // Validate metadata if provided
  if (metadata) {
    if (typeof metadata !== 'object') {
      return errorResponse(res, {
        code: 'INVALID_METADATA_FORMAT',
        message: 'Metadata must be an object',
        userAction: 'Provide metadata as a JSON object',
        details: {
          providedMetadata: metadata,
          expectedType: 'object',
        },
      }, 400);
    }

    // Validate category if provided
    if (metadata.category) {
      const validCategories = ['personal', 'work', 'ideas', 'notes', 'other'];
      if (!validCategories.includes(metadata.category)) {
        return errorResponse(res, {
          code: 'INVALID_CATEGORY',
          message: 'Invalid category',
          userAction: 'Use one of: personal, work, ideas, notes, other',
          details: {
            providedCategory: metadata.category,
            validCategories,
          },
        }, 400);
      }
    }

    // Validate priority if provided
    if (metadata.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(metadata.priority)) {
        return errorResponse(res, {
          code: 'INVALID_PRIORITY',
          message: 'Invalid priority',
          userAction: 'Use one of: low, medium, high, urgent',
          details: {
            providedPriority: metadata.priority,
            validPriorities,
          },
        }, 400);
      }
    }

    // Validate tags if provided
    if (metadata.tags) {
      if (!Array.isArray(metadata.tags)) {
        return errorResponse(res, {
          code: 'INVALID_TAGS_FORMAT',
          message: 'Tags must be an array',
          userAction: 'Provide tags as an array of strings',
          details: {
            providedTags: metadata.tags,
            expectedType: 'array',
          },
        }, 400);
      }

      if (metadata.tags.length > 20) {
        return errorResponse(res, {
          code: 'TOO_MANY_TAGS',
          message: 'Maximum 20 tags allowed',
          userAction: 'Reduce the number of tags to 20 or fewer',
          details: {
            providedTagsCount: metadata.tags.length,
            maxTags: 20,
          },
        }, 400);
      }

      // Validate each tag
      const invalidTags = metadata.tags.filter(
        tag => typeof tag !== 'string' || tag.length < 1 || tag.length > 50,
      );

      if (invalidTags.length > 0) {
        return errorResponse(res, {
          code: 'INVALID_TAG_FORMAT',
          message: 'Invalid tag format',
          userAction: 'Provide tags as strings between 1 and 50 characters',
          details: {
            invalidTags,
            tagRequirements: 'String between 1-50 characters',
          },
        }, 400);
      }
    }
  }

  // Validate encryption if provided
  if (encryption) {
    if (typeof encryption !== 'object') {
      return errorResponse(res, {
        code: 'INVALID_ENCRYPTION_FORMAT',
        message: 'Encryption must be an object',
        userAction: 'Provide encryption as a JSON object',
        details: {
          providedEncryption: encryption,
          expectedType: 'object',
        },
      }, 400);
    }

    const { algorithm, keyId } = encryption;

    if (algorithm) {
      const validAlgorithms = ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'];
      if (!validAlgorithms.includes(algorithm)) {
        return errorResponse(res, {
          code: 'INVALID_ENCRYPTION_ALGORITHM',
          message: 'Invalid encryption algorithm',
          userAction: 'Use one of: aes-256-gcm, aes-256-cbc, chacha20-poly1305',
          details: {
            providedAlgorithm: algorithm,
            validAlgorithms,
          },
        }, 400);
      }
    }

    if (keyId && typeof keyId !== 'string') {
      return errorResponse(res, {
        code: 'INVALID_KEY_ID_FORMAT',
        message: 'Key ID must be a string',
        userAction: 'Provide key ID as a string',
        details: {
          providedKeyId: keyId,
          expectedType: 'string',
        },
      }, 400);
    }
  }

  next();
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return errorResponse(res, {
        code: 'INVALID_PAGE_NUMBER',
        message: 'Page number must be a positive integer',
        userAction: 'Provide a valid page number (1 or greater)',
        details: {
          providedPage: page,
          expectedFormat: 'Positive integer',
        },
      }, 400);
    }
  }

  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return errorResponse(res, {
        code: 'INVALID_LIMIT',
        message: 'Limit must be between 1 and 100',
        userAction: 'Provide a limit between 1 and 100',
        details: {
          providedLimit: limit,
          minLimit: 1,
          maxLimit: 100,
        },
      }, 400);
    }
  }

  next();
};

/**
 * Generic required field validator
 */
const validateRequiredFields = (requiredFields = []) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return errorResponse(res, {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Required fields are missing',
        userAction: 'Include all required fields in request body',
        details: {
          missingFields,
          requiredFields,
          example: requiredFields.reduce((acc, field) => {
            acc[field] = `value_for_${field}`;
            return acc;
          }, {}),
        },
      }, 400);
    }

    next();
  };
};

module.exports = {
  validateNFTGeneration,
  validateDeviceRegistration,
  validateThoughtsInput,
  validatePagination,
  validateRequiredFields,
};
