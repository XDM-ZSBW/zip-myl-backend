// Test setup and configuration
const { config } = require('dotenv');
const path = require('path');

// Load environment variables for testing
const testEnvPath = path.join(__dirname, '..', 'test.config.js');
const testConfig = require(testEnvPath);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CI = 'true';

// Mock Chrome extension APIs globally for all tests
const { mockChrome } = require('./mocks/chromeExtension');

// Set up global Chrome mock
global.chrome = mockChrome;

// Mock Prisma globally for all tests
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  session: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  device: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  pairingCode: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  nftCollection: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Mock Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Make mockPrisma available globally
global.mockPrisma = mockPrisma;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.exit to prevent tests from exiting
const originalExit = process.exit;
process.exit = jest.fn();

// Cleanup after all tests
afterAll(() => {
  process.exit = originalExit;
  // Restore original console
  global.console = originalConsole;
});

// Set test timeout
jest.setTimeout(30000);

// Suppress specific warnings during testing
const originalWarn = console.warn;
console.warn = (...args) => {
  // Suppress specific warnings that are expected in tests
  if (
    args[0]?.includes?.('DeprecationWarning') ||
    args[0]?.includes?.('ExperimentalWarning') ||
    args[0]?.includes?.('MaxListenersExceededWarning')
  ) {
    return;
  }
  originalWarn(...args);
};

// Mock crypto.randomUUID for consistent testing
const crypto = require('crypto');
if (!crypto.randomUUID) {
  crypto.randomUUID = () => {
    return 'test-uuid-' + Math.random().toString(36).substr(2, 9);
  };
}

// Mock Date.now for consistent testing
const originalNow = Date.now;
Date.now = jest.fn(() => 1640995200000); // Fixed timestamp for testing

// Mock Math.random for consistent testing
const originalRandom = Math.random;
Math.random = jest.fn(() => 0.5);

// Enhanced test database setup
const setupTestDatabase = async () => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: testConfig.DATABASE_URL || 'file:./test.db',
        },
      },
    });
    
    // Clean up test database
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;
    
    // Run migrations
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { 
      env: { ...process.env, DATABASE_URL: testConfig.DATABASE_URL },
      stdio: 'inherit' 
    });
    
    await prisma.$disconnect();
    console.log('✅ Test database setup complete');
  } catch (error) {
    console.warn('⚠️ Test database setup failed, using in-memory:', error.message);
  }
};

// Enhanced test utilities
global.testUtils = {
  // Generate test extension ID
  generateExtensionId: () => `test-ext-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Generate test device ID
  generateDeviceId: (extensionId) => `chrome-extension-${extensionId}`,
  
  // Generate test pairing code
  generatePairingCode: () => `test-code-${Math.random().toString(36).substr(2, 9)}`,
  
  // Mock extension request headers
  mockExtensionHeaders: (extensionId) => ({
    'x-extension-id': extensionId,
    'x-extension-version': '2.0.0',
    'x-client-type': 'chrome-extension',
    'Content-Type': 'application/json',
  }),
  
  // Mock extension storage data
  mockExtensionStorage: (extensionId, overrides = {}) => ({
    deviceId: `chrome-extension-${extensionId}`,
    extensionSettings: {
      theme: 'dark',
      autoSync: true,
      nftFormat: 'uuid',
      pairingCodeFormat: 'uuid',
    },
    pairingCodes: [],
    trustedDevices: [],
    nftCollection: [],
    ...overrides,
  }),
  
  // Create test user data
  createTestUser: (overrides = {}) => ({
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  // Create test thought data
  createTestThought: (overrides = {}) => ({
    id: crypto.randomUUID(),
    content: 'Test thought content',
    userId: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  
  // Create test pairing code
  createTestPairingCode: (overrides = {}) => ({
    id: crypto.randomUUID(),
    code: `TEST${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    userId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    createdAt: new Date(),
    ...overrides,
  }),
  
  // Mock Redis operations
  mockRedis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
  },
  
  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    if (global.chrome) {
      Object.values(global.chrome).forEach(api => {
        if (api && typeof api === 'object' && api.mockClear) {
          api.mockClear();
        }
      });
    }
    
    // Reset console mocks safely
    if (console.log && typeof console.log.mockClear === 'function') {
      console.log.mockClear();
    }
    if (console.debug && typeof console.debug.mockClear === 'function') {
      console.debug.mockClear();
    }
    if (console.info && typeof console.info.mockClear === 'function') {
      console.info.mockClear();
    }
    if (console.warn && typeof console.warn.mockClear === 'function') {
      console.warn.mockClear();
    }
    if (console.error && typeof console.error.mockClear === 'function') {
      console.error.mockClear();
    }
    
    // Reset Redis mocks
    Object.values(global.testUtils.mockRedis).forEach(mock => {
      if (mock.mockClear) mock.mockClear();
    });
  },
  
  // Setup test environment
  setupTestEnv: async () => {
    await setupTestDatabase();
    global.testUtils.resetMocks();
  },
};

// Global test setup
beforeAll(async () => {
  await global.testUtils.setupTestEnv();
});

// Cleanup after each test
afterEach(() => {
  global.testUtils.resetMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up test database
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: testConfig.DATABASE_URL || 'file:./test.db',
        },
      },
    });
    
    await prisma.$disconnect();
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Export for use in individual test files
module.exports = {
  mockChrome,
  testUtils: global.testUtils,
  setupTestDatabase,
};
