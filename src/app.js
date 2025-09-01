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

// Import database and cache
const database = require('./config/database');
const redis = require('./config/redis');

const app = express();

// Validate configuration
const configValidation = config.validate();
if (configValidation.warnings.length > 0) {
  logger.info('⚠️  Configuration warnings:', configValidation.warnings);
}
if (configValidation.errors.length > 0) {
  logger.error('Configuration errors:', configValidation.errors);
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

// CORS configuration - Simplified for setup wizard compatibility
app.use(cors({
  origin: true, // Allow all origins for now to fix setup wizard
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-ID', 'Origin', 'X-Requested-With', 'Accept'],
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
  logger.info('Rate limiting enabled');
} else {
  logger.warn('Rate limiting disabled');
}

// Enhanced request logging and monitoring
app.use(requestLogger);
app.use(performanceLogger);
app.use(extensionAnalytics);

// Load routes with error handling
const loadRoutes = (routeName, routePath, routeModule) => {
  try {
    logger.info(`Loading ${routeName}...`);
    app.use(routePath, routeModule);
    logger.info(`${routeName} loaded successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to load ${routeName}:`, error.message);
    return false;
  }
};

// Load essential routes first - API-only structure
logger.info('Loading API routes...');

// Health check endpoint (before API routes)
try {
  const healthRoutes = require('./routes/health');
  loadRoutes('health routes', '/api/v1/health', healthRoutes);
} catch (error) {
  logger.error('Failed to load health routes:', error.message);
}

// Test route
try {
  const testRoutes = require('./routes/test');
  loadRoutes('test routes', '/api/v1/test', testRoutes);
} catch (error) {
  logger.error('Failed to load test routes:', error.message);
}

// Bot-friendly routes (before API routes)
try {
  const botRoutes = require('./routes/bot');
  loadRoutes('bot routes', '/api/v1/bot', botRoutes);
} catch (error) {
  logger.error('❌ Failed to load bot routes:', error.message);
}

// Documentation routes (API documentation only)
try {
  const docsRoutes = require('./routes/docs');
  loadRoutes('docs routes', '/api/v1/docs', docsRoutes);
} catch (error) {
  logger.error('❌ Failed to load docs routes:', error.message);
}

try {
  const openApiRoutes = require('./routes/openapi');
  loadRoutes('OpenAPI routes', '/api/v1/docs', openApiRoutes);
} catch (error) {
  logger.error('❌ Failed to load OpenAPI routes:', error.message);
}

// Authentication routes
try {
  const authRoutes = require('./routes/auth');
  loadRoutes('auth routes', '/api/v1/auth', authRoutes);
} catch (error) {
  logger.error('❌ Failed to load auth routes:', error.message);
}

// Admin routes
try {
  const adminRoutes = require('./routes/admin');
  loadRoutes('admin routes', '/api/v1/admin', adminRoutes);
} catch (error) {
  logger.error('❌ Failed to load admin routes:', error.message);
}

// API routes
try {
  const apiRoutes = require('./routes/api');
  loadRoutes('API routes', '/api/v1', apiRoutes);
} catch (error) {
  logger.error('❌ Failed to load API routes:', error.message);
}

// API v2 routes (Multi-Client Ecosystem)
try {
  const apiV2Routes = require('./routes/api-v2');
  loadRoutes('API v2 routes', '/api/v2', apiV2Routes);
} catch (error) {
  logger.error('❌ Failed to load API v2 routes:', error.message);
}

// Encrypted routes (device registration, pairing, thoughts)
try {
  const encryptedRoutes = require('./routes/encrypted');
  loadRoutes('encrypted routes', '/api/v1/encrypted', encryptedRoutes);
} catch (error) {
  logger.error('❌ Failed to load encrypted routes:', error.message);
}

// Thoughts routes
try {
  const thoughtsRoutes = require('./routes/thoughts');
  loadRoutes('thoughts routes', '/api/v1/thoughts', thoughtsRoutes);
} catch (error) {
  logger.error('❌ Failed to load thoughts routes:', error.message);
}

// NFT routes
try {
  const nftRoutes = require('./routes/nft');
  loadRoutes('NFT routes', '/api/v1/nft', nftRoutes);
} catch (error) {
  logger.error('❌ Failed to load NFT routes:', error.message);
}

// Batch operations routes
try {
  const batchRoutes = require('./routes/batch');
  loadRoutes('batch routes', '/api/v1/batch', batchRoutes);
} catch (error) {
  logger.error('❌ Failed to load batch routes:', error.message);
}

// SSL Certificate routes
try {
  const sslRoutes = require('./routes/ssl');
  loadRoutes('SSL routes', '/api/v1/ssl', sslRoutes);
} catch (error) {
  logger.error('❌ Failed to load SSL routes:', error.message);
}

// Device routes
try {
  const deviceRoutes = require('./routes/device');
  loadRoutes('device routes', '/api/v1/device', deviceRoutes);
} catch (error) {
  logger.error('❌ Failed to load device routes:', error.message);
}

// Windows SSL Integration routes
try {
  const windowsSSLRoutes = require('./routes/windows-ssl');
  loadRoutes('Windows SSL routes', '/api/v1/windows-ssl', windowsSSLRoutes);
} catch (error) {
  logger.error('❌ Failed to load Windows SSL routes:', error.message);
}

logger.info('✅ Route loading completed');

// Metrics endpoint
if (config.ENABLE_METRICS) {
  app.get('/api/v1/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics endpoint - Prometheus metrics will be available here');
  });
  logger.info('✅ Metrics endpoint enabled');
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
          '/api/v1/device',
          '/api/v1/windows-ssl',
          '/api/v1/docs',
        ],
      },
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
      documentationUrl: '/api/v1/docs',
    },
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
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Initialize database and cache connections
async function initializeConnections() {
  try {
    // Initialize database
    await database.initialize();
    logger.info('✅ Database connection established');

    // Initialize Redis cache
    await redis.initialize();
    logger.info('✅ Redis cache connection established');

    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize connections:', error.message);
    logger.error('Connection initialization failed', error);
    return false;
  }
}

// Start server with optional database initialization
async function startServer() {
  try {
    const connectionsReady = await initializeConnections();

    if (!connectionsReady) {
      logger.info('⚠️  Database connection failed, starting server with limited functionality');
      logger.warn('Server starting with limited functionality due to database connection issues');
    } else {
      logger.info('✅ Database connections established');
    }
  } catch (error) {
    logger.info('⚠️  Database initialization error, starting server with limited functionality');
    logger.warn('Server starting with limited functionality due to database initialization error', { error: error.message });
  }

  const server = app.listen(config.PORT, config.HOST, () => {
    logger.info(`Server running on port ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`🚀 Server started successfully on port ${config.PORT}`);
    logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    logger.info(`🔒 Security: ${config.SECURITY_HEADERS ? 'enabled' : 'disabled'}`);
    logger.info(`📊 Metrics: ${config.ENABLE_METRICS ? 'enabled' : 'disabled'}`);
    logger.info('🎯 Service Type: Pure API Service (No Frontend)');
    logger.info(`📚 API Documentation: http://localhost:${config.PORT}/api/v1/docs`);
    logger.info('🔑 API Key Required: X-API-Key header for authenticated endpoints');
    logger.info('🗄️  Database: PostgreSQL with Redis caching');
  });

  return server;
}

// Initialize WebSocket service for real-time communication (optional)
async function initializeWebSocket(server) {
  if (config.ENABLE_WEBSOCKET) {
    try {
      const WebSocketService = require('./services/websocketService');
      const wsService = new WebSocketService(server);
      logger.info('WebSocket service initialized successfully');
      logger.info('✅ WebSocket service initialized');

      // Add WebSocket stats endpoint
      app.get('/api/v1/ws/stats', (req, res) => {
        res.apiSuccess(wsService.getStats(), 'WebSocket statistics retrieved successfully');
      });
    } catch (error) {
      logger.warn('Failed to initialize WebSocket service:', error.message);
      logger.info('⚠️  WebSocket service not available (optional)');
    }
  }
}

// Start the server
let server;
startServer().then((startedServer) => {
  server = startedServer;
  return initializeWebSocket(server);
}).catch((error) => {
  logger.error('❌ Server startup failed:', error.message);
  process.exit(1);
});

module.exports = app;
