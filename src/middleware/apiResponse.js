/**
 * API Response Middleware
 * Standardizes all API responses for consistency and user guidance
 */

const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Standardized success response
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  // Add pagination if present
  if (data && data.pagination) {
    response.pagination = data.pagination;
    // Remove pagination from data to avoid duplication
    const { pagination, ...cleanData } = data;
    response.data = cleanData;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standardized error response
 */
const errorResponse = (res, error, statusCode = 500) => {
  const response = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.details || null,
      userAction: error.userAction || 'Please try again later',
      retryAfter: error.retryAfter || null
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(statusCode).json(response);
};

/**
 * Standardized pagination response
 */
const paginatedResponse = (res, data, page, limit, total, totalPages) => {
  const response = {
    success: true,
    data,
    pagination: {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      total: parseInt(total) || 0,
      totalPages: parseInt(totalPages) || 1,
      hasNext: (parseInt(page) || 1) < (parseInt(totalPages) || 1),
      hasPrev: (parseInt(page) || 1) > 1
    },
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  };

  return res.status(200).json(response);
};

/**
 * Common error responses
 */
const commonErrors = {
  // Authentication errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    userAction: 'Please provide valid authentication credentials',
    statusCode: 401
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
    userAction: 'You do not have permission to access this resource',
    statusCode: 403
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or expired token',
    userAction: 'Please authenticate again to get a new token',
    statusCode: 401
  },

  // Validation errors
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    userAction: 'Please check your input and try again',
    statusCode: 400
  },
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    message: 'Required field is missing',
    userAction: 'Please provide all required fields',
    statusCode: 400
  },
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Invalid data format',
    userAction: 'Please check the data format and try again',
    statusCode: 400
  },

  // Resource errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    userAction: 'Please check the resource identifier and try again',
    statusCode: 404
  },
  ALREADY_EXISTS: {
    code: 'ALREADY_EXISTS',
    message: 'Resource already exists',
    userAction: 'Please use a different identifier or update the existing resource',
    statusCode: 409
  },

  // Rate limiting
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    userAction: 'Please wait before making another request',
    statusCode: 429
  },

  // Server errors
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    userAction: 'Please try again later or contact support if the problem persists',
    statusCode: 500
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    userAction: 'Please try again later',
    statusCode: 503
  }
};

/**
 * Middleware to add response methods to res object
 */
const apiResponseMiddleware = (req, res, next) => {
  // Add response methods to res object
  res.apiSuccess = successResponse.bind(null, res);
  res.apiError = errorResponse.bind(null, res);
  res.apiPaginated = paginatedResponse.bind(null, res);

  // Add common error responses
  res.apiErrors = commonErrors;

  // Add method to send common errors
  res.sendCommonError = (errorKey, customMessage = null, customDetails = null) => {
    const error = commonErrors[errorKey];
    if (error) {
      const errorData = {
        ...error,
        message: customMessage || error.message,
        details: customDetails || error.details
      };
      return errorResponse(res, errorData, error.statusCode);
    }
    // Fallback to internal error if key not found
    return errorResponse(res, {
      code: 'INTERNAL_ERROR',
      message: 'Unknown error occurred',
      userAction: 'Please contact support'
    }, 500);
  };

  next();
};

module.exports = {
  apiResponseMiddleware,
  successResponse,
  errorResponse,
  paginatedResponse,
  commonErrors,
  generateRequestId
};
