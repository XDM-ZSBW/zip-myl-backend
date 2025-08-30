const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Test route loading
console.log('Testing route loading...');

try {
  // Test SSL routes
  const sslRoutes = require('./src/routes/ssl.js');
  app.use('/api/v1/ssl', sslRoutes);
  console.log('✅ SSL routes loaded');
} catch (error) {
  console.error('❌ SSL routes failed:', error.message);
}

try {
  // Test health routes
  const healthRoutes = require('./src/routes/health.js');
  app.use('/api/v1/health', healthRoutes);
  console.log('✅ Health routes loaded');
} catch (error) {
  console.error('❌ Health routes failed:', error.message);
}

// Simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test server working' });
});

// Start server
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test endpoints:');
  console.log('- http://localhost:8081/test');
  console.log('- http://localhost:8081/api/v1/health');
  console.log('- http://localhost:8081/api/v1/ssl');
});
