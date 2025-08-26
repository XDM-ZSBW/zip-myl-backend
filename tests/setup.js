// Test setup file
import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  // Setup code that runs before all tests
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup code that runs after all tests
  console.log('Cleaning up test environment...');
});

// Global test utilities
global.testUtils = {
  // Add any global test utilities here
};
