#!/usr/bin/env node

// Simple test to verify logger functionality
try {
  const logger = require('./src/utils/logger');
  console.log('✅ Logger loaded successfully');
  console.log('Logger type:', typeof logger);
  console.log('Logger methods:', Object.keys(logger));
  
  // Test basic logging
  logger.info('Test info message');
  logger.warn('Test warning message');
  logger.error('Test error message');
  
  console.log('✅ Logger test completed successfully');
} catch (error) {
  console.error('❌ Logger test failed:', error.message);
  console.error('Stack trace:', error.stack);
}
