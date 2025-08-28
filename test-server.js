const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import and mount encrypted routes (includes device registration)
try {
  const encryptedRoutes = require('./src/routes/encrypted');
  app.use('/api/v1/encrypted', encryptedRoutes);
  console.log('✅ Encrypted routes loaded (includes device registration)');
} catch (error) {
  console.log('⚠️  Encrypted routes not available:', error.message);
}

// Import and mount thoughts routes
try {
  const thoughtsRoutes = require('./src/routes/thoughts');
  app.use('/api/v1/thoughts', thoughtsRoutes);
  console.log('✅ Thoughts routes loaded');
} catch (error) {
  console.log('⚠️  Thoughts routes not available:', error.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Myl.Zip Backend Service',
    version: '2.0.0',
    status: 'operational',
    features: {
      endToEndEncryption: true,
      deviceTrust: true,
      crossDeviceSharing: true,
      thoughts: true
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API docs: http://localhost:${PORT}/docs`);
});

module.exports = app;
