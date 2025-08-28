const { Pool } = require('pg');
const { logger } = require('../utils/logger');

class NFTDatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Executed query', { text, duration, rows: res.rowCount });
      }
      
      return res;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query error', { text, duration, error: error.message });
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW()');
      return { 
        status: 'healthy', 
        timestamp: result.rows[0].now,
        database: 'postgresql'
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString(),
        database: 'postgresql'
      };
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Create singleton instance
const nftDatabaseService = new NFTDatabaseService();

module.exports = { nftDatabaseService };
