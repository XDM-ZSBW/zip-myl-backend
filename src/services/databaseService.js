const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const config = require('../utils/config');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Log database queries in development
    if (config.nodeEnv === 'development') {
      this.prisma.$on('query', (e) => {
        logger.debug('Database Query:', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      });
    }

    this.prisma.$on('error', (e) => {
      logger.error('Database Error:', e);
    });

    this.prisma.$on('info', (e) => {
      logger.info('Database Info:', e);
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Database Warning:', e);
    });
  }

  async connect() {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Database disconnection failed:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  getClient() {
    return this.prisma;
  }

  async transaction(callback) {
    return await this.prisma.$transaction(callback);
  }

  async executeRaw(query, params = []) {
    try {
      return await this.prisma.$queryRawUnsafe(query, ...params);
    } catch (error) {
      logger.error('Raw query execution failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
