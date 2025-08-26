import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger.js';

const prisma = new PrismaClient();

async function migrate() {
  try {
    logger.info('🔄 Starting database migration...');

    // Push schema changes to database
    await prisma.$executeRaw`
      -- Create extension for UUID generation if not exists
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `;

    logger.info('✅ Database migration completed successfully!');
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      logger.info('🎉 Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

export default migrate;
