#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs').promises;
const path = require('path');
const database = require('../src/config/database');
const logger = require('../src/utils/logger');

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
    this.migrationsTable = 'migration_history';
  }

  /**
   * Initialize migration system
   */
  async initialize() {
    try {
      await database.initialize();
      await this.createMigrationsTable();
      logger.info('Migration system initialized');
    } catch (error) {
      logger.error('Failed to initialize migration system', error);
      throw error;
    }
  }

  /**
   * Create migrations history table
   */
  async createMigrationsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER,
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT
      );
    `;

    await database.query(createTableSQL);
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsPath);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Natural sort for numbered migrations
    } catch (error) {
      logger.error('Failed to read migrations directory', error);
      throw error;
    }
  }

  /**
   * Get executed migrations from database
   */
  async getExecutedMigrations() {
    try {
      const result = await database.query(
        `SELECT migration_name FROM ${this.migrationsTable} WHERE status = 'success'`
      );
      return result.rows.map(row => row.migration_name);
    } catch (error) {
      logger.error('Failed to get executed migrations', error);
      throw error;
    }
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migrationFile) {
    const startTime = Date.now();
    const migrationPath = path.join(this.migrationsPath, migrationFile);

    try {
      logger.info(`Executing migration: ${migrationFile}`);

      // Read migration file
      const sql = await fs.readFile(migrationPath, 'utf8');

      // Execute migration
      await database.query(sql);

      const executionTime = Date.now() - startTime;

      // Record successful migration
      await database.query(
        `INSERT INTO ${this.migrationsTable} (migration_name, execution_time_ms, status) 
         VALUES ($1, $2, 'success')`,
        [migrationFile, executionTime]
      );

      logger.info(`Migration completed: ${migrationFile} (${executionTime}ms)`);
      return true;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Record failed migration
      await database.query(
        `INSERT INTO ${this.migrationsTable} (migration_name, execution_time_ms, status, error_message) 
         VALUES ($1, $2, 'failed', $3)`,
        [migrationFile, executionTime, error.message]
      );

      logger.error(`Migration failed: ${migrationFile}`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      await this.initialize();

      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations found');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      for (const migrationFile of pendingMigrations) {
        await this.executeMigration(migrationFile);
      }

      logger.info('All migrations completed successfully');

    } catch (error) {
      logger.error('Migration process failed', error);
      throw error;
    } finally {
      await database.close();
    }
  }

  /**
   * Show migration status
   */
  async showStatus() {
    try {
      await this.initialize();

      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();

      logger.info('Migration Status:');
      logger.info('================');

      for (const file of migrationFiles) {
        const status = executedMigrations.includes(file) ? '✅ EXECUTED' : '⏳ PENDING';
        logger.info(`${status} ${file}`);
      }

      const pendingCount = migrationFiles.length - executedMigrations.length;
      logger.info(`\nTotal: ${migrationFiles.length} migrations`);
      logger.info(`Executed: ${executedMigrations.length}`);
      logger.info(`Pending: ${pendingCount}`);

    } catch (error) {
      logger.error('Failed to show migration status', error);
      throw error;
    } finally {
      await database.close();
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackLast() {
    try {
      await this.initialize();

      const result = await database.query(
        `SELECT migration_name FROM ${this.migrationsTable} 
         WHERE status = 'success' 
         ORDER BY executed_at DESC 
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }

      const lastMigration = result.rows[0].migration_name;
      logger.warn(`Rolling back migration: ${lastMigration}`);
      
      // Note: This is a simplified rollback. In production, you'd want proper rollback scripts
      await database.query(
        `UPDATE ${this.migrationsTable} 
         SET status = 'rolled_back', error_message = 'Manually rolled back' 
         WHERE migration_name = $1`,
        [lastMigration]
      );

      logger.info(`Rolled back: ${lastMigration}`);

    } catch (error) {
      logger.error('Rollback failed', error);
      throw error;
    } finally {
      await database.close();
    }
  }
}

// CLI interface
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'run';

  try {
    switch (command) {
      case 'run':
        await runner.runMigrations();
        break;
      case 'status':
        await runner.showStatus();
        break;
      case 'rollback':
        await runner.rollbackLast();
        break;
      default:
        console.log('Usage: node run-migrations.js [run|status|rollback]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
