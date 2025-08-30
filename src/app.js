const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables first
dotenv.config();

// Import configuration and utilities
const config = require('./utils/config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { endpointRateLimit } = require('./middleware/rateLimiter');
const { corsConfig } = require('./middleware/cors');
const { sanitizeInput, validateRequestSize } = require('./middleware/validation');
const {
  validateExtension,
  smartExtensionRateLimit,
  requestLogger,
  performanceLogger,
  extensionAnalytics,
} = require('./middleware');

// Import new API middleware
const { apiResponseMiddleware } = require('./middleware/apiResponse');

const app = express();

// Validate configuration
const configValidation = config.validate();
if (configValidation.warnings.length > 0) {
  console.log('⚠️  Configuration warnings:', configValidation.warnings);
}
if (configValidation.errors.length > 0) {
  console.error('❌ Configuration errors:', configValidation.errors);
  process.exit(1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
    },
  },
}));

// CORS configuration - Updated for API-only service
app.use(cors({
  origin: ['*'], // Allow all origins for API consumption
  credentials: false, // No cookies needed for API
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-ID']
}));

// Compression middleware
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Body parsing middleware
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

// ❌ REMOVED: Static file serving - This is now a pure API service
// app.use(express.static(path.join(__dirname, '../public')));

// ✅ ADD: API Response Middleware - Standardizes all API responses
app.use(apiResponseMiddleware);

// Security middleware
app.use(sanitizeInput);
app.use(validateRequestSize(config.MAX_REQUEST_SIZE));

// Enhanced extension support middleware
app.use(validateExtension);
app.use(smartExtensionRateLimit);

// Rate limiting
if (config.ENABLE_RATE_LIMITING) {
  app.use(endpointRateLimit);
  console.log('✅ Rate limiting enabled');
} else {
  console.log('⚠️  Rate limiting disabled');
}

// Enhanced request logging and monitoring
app.use(requestLogger);
app.use(performanceLogger);
app.use(extensionAnalytics);

// Load routes with error handling
const loadRoutes = (routeName, routePath, routeModule) => {
  try {
    console.log(`Loading ${routeName}...`);
    app.use(routePath, routeModule);
    console.log(`✅ ${routeName} loaded successfully`);
  } catch (error) {
    console.error(`❌ Failed to load ${routeName}:`, error.message);
    logger.error(`Failed to load ${routeName}`, { error: error.message });
  }
};

// Load essential routes first - API-only structure
try {
  // Health check endpoint (before API routes)
  const healthRoutes = require('./routes/health');
  loadRoutes('health routes', '/api/v1/health', healthRoutes);

  // Test route
  const testRoutes = require('./routes/test');
  loadRoutes('test routes', '/api/v1/test', testRoutes);

  // Bot-friendly routes (before API routes)
  const botRoutes = require('./routes/bot');
  loadRoutes('bot routes', '/api/v1/bot', botRoutes);

  // Documentation routes (API documentation only)
  const docsRoutes = require('./routes/docs');
  loadRoutes('docs routes', '/api/v1/docs', docsRoutes);

  const openApiRoutes = require('./routes/openapi');
  loadRoutes('OpenAPI routes', '/api/v1/docs', openApiRoutes);

  // Authentication routes
  const authRoutes = require('./routes/auth');
  loadRoutes('auth routes', '/api/v1/auth', authRoutes);

  // Admin routes
  const adminRoutes = require('./routes/admin');
  loadRoutes('admin routes', '/api/v1/admin', adminRoutes);

  // API routes
  const apiRoutes = require('./routes/api');
  loadRoutes('API routes', '/api/v1', apiRoutes);

  // API v2 routes (Multi-Client Ecosystem)
  const apiV2Routes = require('./routes/api-v2');
  loadRoutes('API v2 routes', '/api/v2', apiV2Routes);

  // Encrypted routes (device registration, pairing, thoughts)
  const encryptedRoutes = require('./routes/encrypted');
  loadRoutes('encrypted routes', '/api/v1/encrypted', encryptedRoutes);

  // Thoughts routes
  const thoughtsRoutes = require('./routes/thoughts');
  loadRoutes('thoughts routes', '/api/v1/thoughts', thoughtsRoutes);

  // NFT routes
  const nftRoutes = require('./routes/nft');
  loadRoutes('NFT routes', '/api/v1/nft', nftRoutes);

  // Batch operations routes
  const batchRoutes = require('./routes/batch');
  loadRoutes('batch routes', '/api/v1/batch', batchRoutes);

  // SSL Certificate routes
  const sslRoutes = require('./routes/ssl');
  loadRoutes('SSL routes', '/api/v1/ssl', sslRoutes);

  // Windows SSL Integration routes
  const windowsSSLRoutes = require('./routes/windows-ssl');
  loadRoutes('Windows SSL routes', '/api/v1/windows-ssl', windowsSSLRoutes);

  // ❌ REMOVED: Root routes that served frontend HTML
  // const rootRoutes = require('./routes/root');
  // loadRoutes('root routes', '/', rootRoutes);
} catch (error) {
  console.error('❌ Critical error loading routes:', error.message);
  logger.error('Critical error loading routes', { error: error.message });
}

// Metrics endpoint
if (config.ENABLE_METRICS) {
  app.get('/api/v1/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics endpoint - Prometheus metrics will be available here');
  });
  console.log('✅ Metrics endpoint enabled');
}

// ✅ ADD: API-only middleware - Redirect all non-API requests to proper error response
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
  } else {
    // Use standardized API response format
    res.apiError({
      code: 'ENDPOINT_NOT_FOUND',
      message: 'This is an API-only service. Frontend should be served separately.',
      userAction: 'Use the appropriate frontend application or API client.',
      details: {
        requestedPath: req.path,
        availableEndpoints: [
          '/api/v1/health',
          '/api/v1/auth',
          '/api/v1/nft',
          '/api/v1/thoughts',
          '/api/v1/ssl',
          '/api/v1/windows-ssl',
          '/api/v1/docs'
        ]
      }
    });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.apiError({
    code: 'API_ENDPOINT_NOT_FOUND',
    message: `API endpoint ${req.originalUrl} not found`,
    userAction: 'Check the API documentation for available endpoints',
    details: {
      requestedEndpoint: req.originalUrl,
      documentationUrl: '/api/v1/docs'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Add error handling for unhandled errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(config.PORT, config.HOST, () => {
  logger.info(`Server running on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  console.log(`🚀 Server started successfully on port ${config.PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔒 Security: ${config.SECURITY_HEADERS ? 'enabled' : 'disabled'}`);
  console.log(`📊 Metrics: ${config.ENABLE_METRICS ? 'enabled' : 'disabled'}`);
  console.log(`🎯 Service Type: Pure API Service (No Frontend)`);
  console.log(`📚 API Documentation: http://localhost:${config.PORT}/api/v1/docs`);
  console.log(`🔑 API Key Required: X-API-Key header for authenticated endpoints`);
});

// Initialize WebSocket service for real-time communication (optional)
if (config.ENABLE_WEBSOCKET) {
  try {
    const WebSocketService = require('./services/websocketService');
    const wsService = new WebSocketService(server);
    logger.info('WebSocket service initialized successfully');
    console.log('✅ WebSocket service initialized');

    // Add WebSocket stats endpoint
    app.get('/api/v1/ws/stats', (req, res) => {
      res.apiSuccess(wsService.getStats(), 'WebSocket statistics retrieved successfully');
    });
  } catch (error) {
    logger.warn('Failed to initialize WebSocket service:', error.message);
    console.log('⚠️  WebSocket service not available (optional)');
  }
}

module.exports = app;
