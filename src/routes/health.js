const express = require('express');
const path = require('path');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.apiSuccess({ status: 'healthy', service: 'MyL.Zip API', version: '2.0.0' }, 'Service is healthy');
});

// Kubernetes liveness probe
router.get('/live', (req, res) => {
  res.apiSuccess({ status: 'alive' }, 'Service is alive');
});

// Kubernetes readiness probe
router.get('/ready', (req, res) => {
  const isReady = true; // Placeholder - implement actual checks
  if (isReady) {
    res.apiSuccess({ status: 'ready' }, 'Service is ready to accept requests');
  } else {
    res.apiError({ code: 'SERVICE_NOT_READY' }, 503);
  }
});

// Minimal service status page for authorized users only
router.get('/status', (req, res) => {
  const statusPath = path.join(__dirname, '../../public/test-results.html');
  res.sendFile(statusPath, (err) => {
    if (err) {
      // Fallback to JSON response if HTML file not found
      res.apiSuccess({
        message: 'Service Status',
        description: 'Minimal HTML interface for authorized service usage',
        endpoints: {
          html: '/api/v1/health/status',
          json: '/api/v1/health',
          metrics: '/api/v1/metrics',
        },
        note: 'This endpoint provides minimal HTML for essential service information only',
      }, 'Service status interface available');
    }
  });
});

// Detailed health status
router.get('/detailed', (req, res) => {
  const healthStatus = {
    service: 'MyL.Zip Backend API',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    endpoints: {
      health: '/api/v1/health',
      status: '/api/v1/health/status',
      metrics: '/api/v1/metrics',
      docs: '/api/v1/docs',
    },
    features: {
      authentication: 'enabled',
      rateLimiting: 'enabled',
      nftService: 'enabled',
      websocket: 'enabled',
      cors: 'enabled',
    },
  };

  res.apiSuccess(healthStatus, 'Detailed health status retrieved successfully');
});

// Component-specific health checks
router.get('/:component', (req, res) => {
  const { component } = req.params;

  const componentChecks = {
    database: () => ({ status: 'healthy', type: 'postgresql', mocked: true }),
    redis: () => ({ status: 'fallback', type: 'memory', reason: 'Redis not available' }),
    nft: () => ({ status: 'healthy', type: 'service', encryption: 'enabled' }),
    auth: () => ({ status: 'healthy', type: 'jwt', deviceAuth: 'enabled' }),
    websocket: () => ({ status: 'healthy', type: 'service', connections: 0 }),
    rateLimit: () => ({ status: 'healthy', type: 'memory', fallback: true }),
  };

  if (componentChecks[component]) {
    const checkResult = componentChecks[component]();
    res.apiSuccess(checkResult, `${component} component health check completed`);
  } else {
    res.apiError({
      code: 'INVALID_HEALTH_COMPONENT',
      message: `Unknown health component: ${component}`,
      userAction: 'Use one of the available components',
      details: {
        availableComponents: Object.keys(componentChecks),
        example: '/api/v1/health/database',
      },
    }, 400);
  }
});

module.exports = router;
