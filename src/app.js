const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');

const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { endpointRateLimit } = require('./middleware/rateLimiter');
const { corsConfig } = require('./middleware/cors');
const { sanitizeInput, validateRequestSize } = require('./middleware/validation');
const apiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const docsRoutes = require('./routes/docs');
const openApiRoutes = require('./routes/openapi');
const rootRoutes = require('./routes/root');
const botRoutes = require('./routes/bot');
const testRoutes = require('./routes/test');
const minimalRoutes = require('./routes/minimal');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
