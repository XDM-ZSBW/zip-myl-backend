/**
 * Test version of the main application
 * This version doesn't start the server, making it suitable for testing
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import configuration and utilities
const config = require('./utils/config');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Security middleware
if (config.SECURITY_HEADERS) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        scriptSrc: ['\'self\'', '\'unsafe-inline\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        connectSrc: ['\'self\''],
        fontSrc: ['\'self\''],
        objectSrc: ['\'none\''],
        mediaSrc: ['\'self\''],
        frameSrc: ['\'none\''],
      },
    },
    hsts: {
      maxAge: config.HSTS_MAX_AGE,
      includeSubDomains: true,
      preload: true,
    },
  }));
  logger.info('✅ Security headers enabled');
}

// CORS configuration
app.use(cors(config.cors));
logger.info('✅ CORS configured');

// Compression middleware
if (config.COMPRESSION_ENABLED) {
  app.use(compression());
  logger.info('✅ Compression enabled');
}

// Request parsing middleware
app.use(express.json({ limit: config.MAX_REQUEST_SIZE }));
app.use(express.urlencoded({ extended: true, limit: config.MAX_REQUEST_SIZE }));

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting middleware - disabled in test environment
if (config.ENABLE_RATE_LIMITING && config.NODE_ENV !== 'test') {
  try {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      skipSuccessfulRequests: config.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
      },
    });
    app.use(limiter);
    logger.info('✅ Rate limiting enabled');
  } catch (error) {
    logger.warn('⚠️ Rate limiting disabled:', error.message);
  }
} else if (config.NODE_ENV === 'test') {
  logger.info('✅ Rate limiting disabled in test environment');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '2.0.0',
  });
});

// Load routes
try {
  // Health routes
  const healthRoutes = require('./routes/health');
  app.use('/health', healthRoutes);
  logger.info('✅ Health routes loaded');

  // Documentation routes
  const docsRoutes = require('./routes/docs');
  app.use('/docs', docsRoutes);
  logger.info('✅ Documentation routes loaded');

  // Authentication routes
  const authRoutes = require('./routes/auth');
  app.use('/api/v1/auth', authRoutes);
  logger.info('✅ Authentication routes loaded');

  // Device routes
  const deviceRoutes = require('./routes/device');
  app.use('/api/v1/devices', deviceRoutes);
  logger.info('✅ Device routes loaded');

  // Enhanced Trust Network routes
  const enhancedTrustNetworkRoutes = require('./routes/enhancedTrustNetwork');
  app.use('/api/v1/trust-network', enhancedTrustNetworkRoutes);
  logger.info('✅ Enhanced Trust Network routes loaded');

  // Plugin routes
  const pluginRoutes = require('./routes/plugin');
  app.use('/api/v1/plugins', pluginRoutes);
  logger.info('✅ Plugin routes loaded');

  // Workspace routes
  const workspaceRoutes = require('./routes/workspace');
  app.use('/api/v1/workspaces', workspaceRoutes);
  logger.info('✅ Workspace routes loaded');

  // Sync routes
  const syncRoutes = require('./routes/sync');
  app.use('/api/v1/sync', syncRoutes);
  logger.info('✅ Sync routes loaded');

  // Admin routes
  const adminRoutes = require('./routes/admin');
  app.use('/api/v1/admin', adminRoutes);
  logger.info('✅ Admin routes loaded');

  // API routes
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  logger.info('✅ API routes loaded');

  // API v2 routes (Multi-Client Ecosystem)
  const apiV2Routes = require('./routes/api-v2');
  app.use('/api', apiV2Routes);
  logger.info('✅ API v2 routes loaded');

  // Encrypted routes (device registration, pairing, thoughts)
  const encryptedRoutes = require('./routes/encrypted');
  app.use('/api/v1/encrypted', encryptedRoutes);
  logger.info('✅ Encrypted routes loaded');

  // Thoughts routes
  const thoughtsRoutes = require('./routes/thoughts');
  app.use('/api/v1/thoughts', thoughtsRoutes);
  logger.info('✅ Thoughts routes loaded');

  // NFT routes
  const nftRoutes = require('./routes/nft');
  app.use('/api/v1/nft', nftRoutes);
  logger.info('✅ NFT routes loaded');

  // Batch operations routes
  const batchRoutes = require('./routes/batch');
  app.use('/api/v1/batch', batchRoutes);
  logger.info('✅ Batch operations routes loaded');

  // Root routes (must be after API routes)
  const rootRoutes = require('./routes/root');
  app.use('/', rootRoutes);
  logger.info('✅ Root routes loaded');
} catch (error) {
  logger.error('❌ Critical error loading routes:', error.message);
  logger.error('Critical error loading routes', { error: error.message });
}

// Metrics endpoint
if (config.ENABLE_METRICS) {
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('# Metrics endpoint - Prometheus metrics will be available here');
  });
  logger.info('✅ Metrics endpoint enabled');
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

// NOTE: This version does NOT start the server
// It only exports the configured app for testing purposes

module.exports = app;
