import databaseService from '../services/databaseService.js';
import cacheService from '../services/cacheService.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

export const healthCheck = async (req, res, next) => {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await databaseService.healthCheck();
    
    // Check cache health
    const cacheHealth = await cacheService.healthCheck();
    
    const responseTime = Date.now() - startTime;
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbHealth,
        cache: cacheHealth,
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
    };

    // Determine overall health status
    if (dbHealth.status !== 'healthy') {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: { status: 'unknown' },
        cache: { status: 'unknown' },
      },
    });
  }
};

export const readinessCheck = async (req, res, next) => {
  try {
    // Check if the service is ready to accept traffic
    const dbHealth = await databaseService.healthCheck();
    
    if (dbHealth.status !== 'healthy') {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not available',
      });
    }

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

export const livenessCheck = async (req, res, next) => {
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

export default {
  healthCheck,
  readinessCheck,
  livenessCheck,
};
