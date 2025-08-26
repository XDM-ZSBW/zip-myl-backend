const { logger } = require('../utils/logger');
const { config } = require('../utils/config');

const healthCheck = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Check if this is a simple health check request
    const isSimpleCheck = req.query.simple === 'true' || req.headers['user-agent']?.includes('health-check');
    
    if (isSimpleCheck) {
      // Simple health check for load balancers and monitoring
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
      return;
    }
    
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: { status: 'not_configured' },
        cache: { status: 'not_configured' },
        secrets: { status: 'configured' },
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      api: {
        endpoints: {
          auth: '/api/v1/auth',
          device: '/api/v1/device',
          admin: '/api/v1/admin',
          docs: '/docs',
          health: '/health'
        },
        features: [
          'anonymous-device-auth',
          'zero-knowledge-architecture',
          'rate-limiting',
          'api-key-management',
          'audit-logging'
        ]
      }
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

const readinessCheck = async (req, res, next) => {
  try {
    // Simple readiness check - service is ready if it can respond
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

const livenessCheck = async (req, res, next) => {
  try {
    // Simple liveness check - just verify the process is running
    res.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Liveness check failed:', error);
    
    res.status(503).json({
      status: 'not alive',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck,
};