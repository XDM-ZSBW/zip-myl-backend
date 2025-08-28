// Test setup and configuration
const { config } = require('dotenv');
const path = require('path');

// Load environment variables for testing
const testEnvPath = path.join(__dirname, '..', 'test.config.js');
const testConfig = require(testEnvPath);

// Set test environment
process.env.NODE_ENV = 'test';
process.env.CI = 'true';

// Set required environment variables for tests (JWT service still uses these directly)
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Mock Google Secret Manager
jest.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: jest.fn(() => ({
    accessSecretVersion: jest.fn().mockResolvedValue([{
      payload: {
        data: Buffer.from('test-secret-value-for-testing-only'),
      },
    }]),
  })),
}));

// Mock the secret manager service
jest.mock('../src/services/secretManagerService', () => ({
  getSecret: jest.fn().mockResolvedValue('test-secret-value-for-testing-only'),
  getJWTSecret: jest.fn().mockResolvedValue('test-jwt-secret-key-for-testing-only'),
  getEncryptionKey: jest.fn().mockResolvedValue('test-encryption-key-for-testing-only'),
  getServiceApiKey: jest.fn().mockResolvedValue('test-service-api-key-for-testing-only'),
}));

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
    deleteMany: jest.fn(),
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
    deleteMany: jest.fn(),
  },
  device: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  thought: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  pairingCode: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  nftCollection: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  pairingToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  invalidNft: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  userNftProfile: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
};

// Mock Prisma module
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock the Thought model to avoid database connection issues
jest.mock('../src/models/Thought', () => ({
  Thought: {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock database services
jest.mock('../src/services/nftDatabaseService', () => ({
  nftDatabaseService: {
    query: jest.fn().mockResolvedValue({
      rows: [
        {
          id: 'test-id',
          token: 'test-token',
          user_id: 'test-user',
          platform: 'ethereum',
          expires_at: new Date(),
          created_at: new Date(),
        }
      ],
      rowCount: 1,
    }),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock the pool module to avoid real database connections
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
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
    return `test-uuid-${Math.random().toString(36).substr(2, 9)}`;
  };
}

// Mock Date.now for consistent testing
const originalNow = Date.now;
Date.now = jest.fn(() => 1640995200000); // Fixed timestamp for testing

// Mock Math.random for consistent testing
const originalRandom = Math.random;
Math.random = jest.fn(() => 0.5);

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

  // Setup test environment (simplified)
  setupTestEnv: async() => {
    // Skip database setup for now to avoid issues
    global.testUtils.resetMocks();
  },
};

// Global test setup
beforeAll(async() => {
  await global.testUtils.setupTestEnv();
});

// Cleanup after each test
afterEach(() => {
  global.testUtils.resetMocks();
});

// Cleanup after all tests
afterAll(async() => {
  // No database cleanup needed for now
  
  // Force cleanup of any remaining timers or handles
  jest.clearAllTimers();
  
  // Restore original Date.now and Math.random
  Date.now = originalNow;
  Math.random = originalRandom;
  
  // Clear any remaining timeouts
  jest.clearAllTimers();
  
  // Clean up SessionManager timer if it exists
  try {
    const SessionManager = require('../src/auth/sessionManager');
    if (SessionManager.stopCleanupTimer) {
      SessionManager.stopCleanupTimer();
    }
  } catch (error) {
    // Ignore errors if SessionManager is not available
  }
  
  // Wait a bit for any remaining async operations
  await new Promise(resolve => setTimeout(resolve, 50));
});

// Export for use in individual test files
module.exports = {
  mockChrome,
  testUtils: global.testUtils,
};
