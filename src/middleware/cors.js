const config = require('../utils/config');

module.exports = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list
    if (Array.isArray(config.cors.origin) && config.cors.origin.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        return origin.startsWith(allowedOrigin.replace('*', ''));
      }
      return allowedOrigin === origin;
    })) {
      return callback(null, true);
    }

    // In development, allow localhost with any port
    if (config.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }

    // Reject origin
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: config.cors.credentials,
  optionsSuccessStatus: config.cors.optionsSuccessStatus,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'x-extension-id',
    'x-extension-version',
    'x-client-type',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};
