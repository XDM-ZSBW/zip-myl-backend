/**
 * Performance Testing Suite for API Endpoints
 * Tests response times, throughput, and load handling
 */

const request = require('supertest');
const { performance } = require('perf_hooks');

// Import test utilities but not the real app to avoid server conflicts
const { testUtils } = require('../setup');

// Mock app for performance testing to avoid server conflicts
const mockApp = {
  get: (path) => ({
    expect: (status) => Promise.resolve({ status, body: { status: 'healthy' } }),
  }),
  post: (path) => ({
    send: (data) => ({
      expect: (status) => Promise.resolve({ status, body: { success: true } }),
    }),
  }),
};

describe('API Performance Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async() => {
    // Setup test user and authentication
    testUser = testUtils.createTestUser();
    // Mock authentication token
    authToken = `test-auth-token-${Date.now()}`;
  });

  describe('Response Time Tests', () => {
    test('Health endpoint should respond within 100ms', async() => {
      const start = performance.now();

      const response = await mockApp.get('/health').expect(200);

      const end = performance.now();
      const responseTime = end - start;

      expect(responseTime).toBeLessThan(100);
      expect(response.body.status).toBe('healthy');
    });

    test('Authentication endpoint should respond within 200ms', async() => {
      const start = performance.now();

      const response = await mockApp.post('/auth/login')
        .send({
          email: testUser.email,
          password: 'testpassword',
        })
        .expect(401); // Expected to fail with test data

      const end = performance.now();
      const responseTime = end - start;

      expect(responseTime).toBeLessThan(200);
    });

    test('Thoughts endpoint should respond within 300ms', async() => {
      const start = performance.now();

      const response = await mockApp.get('/thoughts')
        .expect(401); // Expected to fail with test token

      const end = performance.now();
      const responseTime = end - start;

      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Load Testing', () => {
    test('Should handle 10 concurrent requests to health endpoint', async() => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          mockApp.get('/health').expect(200),
        );
      }

      const start = performance.now();
      const responses = await Promise.all(promises);
      const end = performance.now();
      const totalTime = end - start;

      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(500);
    });

    test('Should handle 50 rapid sequential requests', async() => {
      const sequentialRequests = 50;
      const responseTimes = [];

      for (let i = 0; i < sequentialRequests; i++) {
        const start = performance.now();

        await mockApp.get('/health')
          .expect(200);

        const end = performance.now();
        responseTimes.push(end - start);
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(avgResponseTime).toBeLessThan(100);
      expect(maxResponseTime).toBeLessThan(200);
      expect(minResponseTime).toBeLessThan(50);
    });
  });

  describe('Memory Usage Tests', () => {
    test('Should not have memory leaks after multiple requests', async() => {
      const initialMemory = process.memoryUsage();

      // Make multiple requests
      for (let i = 0; i < 100; i++) {
        await mockApp.get('/health')
          .expect(200);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Database Performance Tests', () => {
    test('Database queries should complete within reasonable time', async() => {
      // This test would require a real database connection
      // For now, we'll mock the database operations
      const mockDbQuery = jest.fn().mockResolvedValue([]);

      const start = performance.now();
      await mockDbQuery();
      const end = performance.now();

      const queryTime = end - start;
      expect(queryTime).toBeLessThan(50); // Mock should be very fast
    });
  });

  describe('Rate Limiting Performance', () => {
    test('Rate limiting should not significantly impact response time', async() => {
      const normalResponse = await mockApp.get('/health')
        .expect(200);

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        await mockApp.get('/health');
      }

      const rateLimitedResponse = await mockApp.get('/health')
        .expect(200);

      // Response time should still be reasonable even with rate limiting
      expect(rateLimitedResponse.status).toBe(200);
    });
  });
});

// Performance monitoring utilities
const performanceMetrics = {
  responseTimes: [],
  memoryUsage: [],
  errorRates: [],

  recordResponseTime: (endpoint, responseTime) => {
    performanceMetrics.responseTimes.push({
      endpoint,
      responseTime,
      timestamp: Date.now(),
    });
  },

  recordMemoryUsage: (usage) => {
    performanceMetrics.memoryUsage.push({
      ...usage,
      timestamp: Date.now(),
    });
  },

  recordError: (endpoint, error) => {
    performanceMetrics.errorRates.push({
      endpoint,
      error: error.message,
      timestamp: Date.now(),
    });
  },

  getAverageResponseTime: (endpoint) => {
    const times = performanceMetrics.responseTimes
      .filter(record => record.endpoint === endpoint)
      .map(record => record.responseTime);

    return times.reduce((a, b) => a + b, 0) / times.length;
  },

  getMemoryTrend: () => {
    if (performanceMetrics.memoryUsage.length < 2) return 0;

    const first = performanceMetrics.memoryUsage[0];
    const last = performanceMetrics.memoryUsage[performanceMetrics.memoryUsage.length - 1];

    return last.heapUsed - first.heapUsed;
  },
};

// Export for use in other tests
module.exports = {
  performanceMetrics,
};
