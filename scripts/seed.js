import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const seedData = {
  thoughts: [
    {
      id: uuidv4(),
      content: 'Welcome to Myl.Zip! This is your first thought.',
      metadata: {
        source: 'seed',
        tags: ['welcome', 'first'],
        priority: 'high'
      },
      url: 'https://myl.zip',
      timestamp: new Date(),
    },
    {
      id: uuidv4(),
      content: 'Thought tracking helps you capture ideas and insights as you browse the web.',
      metadata: {
        source: 'seed',
        tags: ['feature', 'tracking'],
        priority: 'medium'
      },
      url: 'https://myl.zip/features',
      timestamp: new Date(),
    },
    {
      id: uuidv4(),
      content: 'The backend service provides secure storage and retrieval of your thoughts.',
      metadata: {
        source: 'seed',
        tags: ['backend', 'security'],
        priority: 'high'
      },
      url: 'https://myl.zip/backend',
      timestamp: new Date(),
    },
  ],
  users: [
    {
      id: uuidv4(),
      email: 'demo@myl.zip',
      name: 'Demo User',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    },
  ],
};

async function seed() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Clear existing data
    await prisma.thought.deleteMany();
    await prisma.user.deleteMany();

    logger.info('🗑️  Cleared existing data');

    // Seed users
    for (const user of seedData.users) {
      await prisma.user.create({
        data: user,
      });
    }
    logger.info(`👤 Created ${seedData.users.length} users`);

    // Seed thoughts
    for (const thought of seedData.thoughts) {
      await prisma.thought.create({
        data: thought,
      });
    }
    logger.info(`💭 Created ${seedData.thoughts.length} thoughts`);

    logger.info('✅ Database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      logger.info('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

export default seed;
