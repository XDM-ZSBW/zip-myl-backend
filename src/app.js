const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { endpointRateLimit } = require('./middleware/rateLimiter');
const { corsConfig } = require('./middleware/cors');
const { sanitizeInput, validateRequestSize } = require('./middleware/validation');
const apiRoutes = require('./routes/api');
const apiV2Routes = require('./routes/api-v2');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const docsRoutes = require('./routes/docs');
const openApiRoutes = require('./routes/openapi');
const rootRoutes = require('./routes/root');
const botRoutes = require('./routes/bot');
const testRoutes = require('./routes/test');
const minimalRoutes = require('./routes/minimal');
const encryptedRoutes = require('./routes/encrypted');
const thoughtsRoutes = require('./routes/thoughts');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
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
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Security middleware
app.use(sanitizeInput);
app.use(validateRequestSize('10mb'));

// Rate limiting
app.use(endpointRateLimit);

// Minimal test route (first priority)
console.log('Loading minimal routes...');
app.use('/minimal', minimalRoutes);
console.log('Minimal routes loaded successfully');

// Test route
app.use('/test', testRoutes);

// Bot-friendly routes (before API routes)
app.use('/bot', botRoutes);

// Documentation routes (before API routes)
app.use('/docs', docsRoutes);
app.use('/api/docs', openApiRoutes);

// Health check endpoint (before API routes)
app.use('/health', healthRoutes);

// Authentication routes
app.use('/api/v1/auth', authRoutes);

// Admin routes
app.use('/api/v1/admin', adminRoutes);

// API routes
app.use('/api', apiRoutes);

// API v2 routes (Multi-Client Ecosystem)
app.use('/api', apiV2Routes);

// Encrypted routes (device registration, pairing, thoughts)
console.log('Loading encrypted routes...');
app.use('/api/v1/encrypted', encryptedRoutes);
console.log('Encrypted routes loaded successfully');

// Thoughts routes
console.log('Loading thoughts routes...');
app.use('/api/v1/thoughts', thoughtsRoutes);
console.log('Thoughts routes loaded successfully');

// Root routes (must be after API routes)
app.use('/', rootRoutes);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('# Metrics endpoint - Prometheus metrics will be available here');
});

// Root endpoint is now handled by rootRoutes

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
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
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WebSocket service for real-time communication
if (process.env.ENABLE_WEBSOCKET !== 'false') {
  try {
    const WebSocketService = require('./services/websocketService');
    const wsService = new WebSocketService(server);
    logger.info('WebSocket service initialized successfully');
    
    // Add WebSocket stats endpoint
    app.get('/ws/stats', (req, res) => {
      res.json({
        success: true,
        data: wsService.getStats()
      });
    });
  } catch (error) {
    logger.error('Failed to initialize WebSocket service:', error);
  }
}

module.exports = app;
