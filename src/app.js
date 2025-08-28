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

// CORS configuration
app.use(cors(corsConfig));

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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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

// Load essential routes first
try {
  // Minimal test route (first priority)
  const minimalRoutes = require('./routes/minimal');
  loadRoutes('minimal routes', '/minimal', minimalRoutes);

  // Health check endpoint (before API routes)
  const healthRoutes = require('./routes/health');
  loadRoutes('health routes', '/health', healthRoutes);

  // Test route
  const testRoutes = require('./routes/test');
  loadRoutes('test routes', '/test', testRoutes);

  // Bot-friendly routes (before API routes)
  const botRoutes = require('./routes/bot');
  loadRoutes('bot routes', '/bot', botRoutes);

  // Documentation routes (before API routes)
  const docsRoutes = require('./routes/docs');
  loadRoutes('docs routes', '/docs', docsRoutes);

  const openApiRoutes = require('./routes/openapi');
  loadRoutes('OpenAPI routes', '/api/docs', openApiRoutes);

  // Authentication routes
  const authRoutes = require('./routes/auth');
  loadRoutes('auth routes', '/api/v1/auth', authRoutes);

  // Admin routes
  const adminRoutes = require('./routes/admin');
  loadRoutes('admin routes', '/api/v1/admin', adminRoutes);

  // API routes
  const apiRoutes = require('./routes/api');
  loadRoutes('API routes', '/api', apiRoutes);

  // API v2 routes (Multi-Client Ecosystem)
  const apiV2Routes = require('./routes/api-v2');
  loadRoutes('API v2 routes', '/api', apiV2Routes);

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

  // Root routes (must be after API routes)
  const rootRoutes = require('./routes/root');
  loadRoutes('root routes', '/', rootRoutes);
} catch (error) {
  console.error('❌ Critical error loading routes:', error.message);
  logger.error('Critical error loading routes', { error: error.message });
}

// Metrics endpoint
if (config.ENABLE_METRICS) {
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics endpoint - Prometheus metrics will be available here');
  });
  console.log('✅ Metrics endpoint enabled');
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
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

// Start server
const server = app.listen(config.PORT, config.HOST, () => {
  logger.info(`Server running on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  console.log(`🚀 Server started successfully on port ${config.PORT}`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🔒 Security: ${config.SECURITY_HEADERS ? 'enabled' : 'disabled'}`);
  console.log(`📊 Metrics: ${config.ENABLE_METRICS ? 'enabled' : 'disabled'}`);
});

// Initialize WebSocket service for real-time communication (optional)
if (config.ENABLE_WEBSOCKET) {
  try {
    const WebSocketService = require('./services/websocketService');
    const wsService = new WebSocketService(server);
    logger.info('WebSocket service initialized successfully');
    console.log('✅ WebSocket service initialized');

    // Add WebSocket stats endpoint
    app.get('/ws/stats', (req, res) => {
      res.json({
        success: true,
        data: wsService.getStats(),
      });
    });
  } catch (error) {
    logger.warn('Failed to initialize WebSocket service:', error.message);
    console.log('⚠️  WebSocket service not available (optional)');
  }
}

module.exports = app;
