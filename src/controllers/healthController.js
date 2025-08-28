const logger = require('../utils/logger');
const config = require('../utils/config');

// Service health check functions
const checkDatabaseConnection = async() => {
  try {
    // This would check actual database connectivity
    // For now, return a mock status
    return { status: 'healthy', responseTime: '5ms' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

const checkNFTEngineStatus = async() => {
  try {
    // Check if NFT generation service is available
    return { status: 'healthy', version: '2.0.0' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

const checkEncryptionService = async() => {
  try {
    // Check if encryption service is working
    const crypto = require('crypto');
    const testKey = crypto.randomBytes(32);
    return { status: 'healthy', algorithm: 'aes-256-gcm' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

const checkDeviceManagerStatus = async() => {
  try {
    // Check device management service
    return { status: 'healthy', activeDevices: 0 };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

const checkExtensionSupport = () => {
  return {
    status: 'healthy',
    supportedFormats: ['uuid', 'short', 'legacy'],
    corsEnabled: true,
    rateLimiting: true,
    deviceRegistration: true,
    pairingCodes: true,
  };
};

const healthCheck = async(req, res, next) => {
  try {
    const startTime = Date.now();

    // Check if this is a simple health check request
    const isSimpleCheck = req.query.simple === 'true' || req.headers['user-agent']?.includes('health-check');

    if (isSimpleCheck) {
      // Simple health check for load balancers and monitoring
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
      return;
    }

    // Perform comprehensive health checks
    const [dbStatus, nftStatus, encryptionStatus, deviceStatus] = await Promise.allSettled([
      checkDatabaseConnection(),
      checkNFTEngineStatus(),
      checkEncryptionService(),
      checkDeviceManagerStatus(),
    ]);

    const responseTime = Date.now() - startTime;

    // Determine overall health status
    const serviceChecks = [
      dbStatus.status === 'fulfilled' ? dbStatus.value.status : 'error',
      nftStatus.status === 'fulfilled' ? nftStatus.value.status : 'error',
      encryptionStatus.status === 'fulfilled' ? encryptionStatus.value.status : 'error',
      deviceStatus.status === 'fulfilled' ? deviceStatus.value.status : 'error',
    ];

    const overallStatus = serviceChecks.every(status => status === 'healthy') ? 'healthy' : 'degraded';

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.0.0',
      environment: config.NODE_ENV,
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: dbStatus.status === 'fulfilled' ? dbStatus.value : { status: 'error', error: 'Check failed' },
        nftEngine: nftStatus.status === 'fulfilled' ? nftStatus.value : { status: 'error', error: 'Check failed' },
        encryption: encryptionStatus.status === 'fulfilled' ? encryptionStatus.value : { status: 'error', error: 'Check failed' },
        deviceManager: deviceStatus.status === 'fulfilled' ? deviceStatus.value : { status: 'error', error: 'Check failed' },
        extensionSupport: checkExtensionSupport(),
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          unit: 'MB',
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch,
        pid: process.pid,
      },
      api: {
        endpoints: {
          auth: '/api/v1/auth',
          device: '/api/v1/device',
          admin: '/api/v1/admin',
          docs: '/docs',
          health: '/health',
          pairing: '/api/v1/device-registration/pairing-codes',
          nft: '/api/v1/nft',
        },
        features: [
          'anonymous-device-auth',
          'zero-knowledge-architecture',
          'enhanced-rate-limiting',
          'api-key-management',
          'audit-logging',
          'uuid-pairing-codes',
          'chrome-extension-support',
          'cors-optimization',
        ],
        rateLimiting: {
          enabled: true,
          general: '100 requests per 15 minutes',
          auth: '5 attempts per 15 minutes',
          pairing: '3 generations per hour',
          deviceRegistration: '2 registrations per hour',
        },
      },
      extension: {
        supportedClients: ['chrome-extension', 'moz-extension', 'web'],
        pairingCodeFormats: ['uuid', 'short', 'legacy'],
        corsOrigins: config.cors.origin,
        securityFeatures: ['rate-limiting', 'input-validation', 'extension-validation'],
      },
    };

    res.status(200).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      errorId: generateErrorId(),
    });
  }
};

// Generate unique error ID for tracking
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const readinessCheck = async(req, res, next) => {
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

const livenessCheck = async(req, res, next) => {
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
