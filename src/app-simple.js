const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Myl.Zip Backend Service',
    version: '2.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    features: {
      endToEndEncryption: true,
      deviceTrust: true,
      crossDeviceSharing: true,
      deviceRegistration: true,
      keyManagement: true
    },
    endpoints: {
      health: '/health',
      api: '/api/v1',
      encrypted: '/api/v1/encrypted',
      devices: '/api/v1/encrypted/devices'
    }
  });
});

// Basic API endpoints
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Myl.Zip API v1',
    version: '2.0.0',
    status: 'operational'
  });
});

// Try to load enhanced routes, but don't fail if they don't work
try {
  console.log('Attempting to load enhanced routes...');
  
  // Import encrypted routes
  const encryptedRoutes = require('./routes/encrypted');
  app.use('/api/v1/encrypted', encryptedRoutes);
  console.log('✅ Encrypted routes loaded');
  
  // Import device registration routes
  const deviceRegistrationRoutes = require('./routes/deviceRegistration');
  app.use('/api/v1/encrypted/devices', deviceRegistrationRoutes);
  console.log('✅ Device registration routes loaded');
  
} catch (error) {
  console.log('⚠️  Enhanced routes not available:', error.message);
  console.log('Running in basic mode with core endpoints only');
  
  // Provide basic encrypted endpoints
  app.get('/api/v1/encrypted', (req, res) => {
    res.json({
      message: 'Encrypted API endpoints',
      status: 'basic_mode',
      note: 'Enhanced features not available in this deployment'
    });
  });
  
  app.get('/api/v1/encrypted/devices', (req, res) => {
    res.json({
      message: 'Device registration endpoints',
      status: 'basic_mode',
      note: 'Enhanced features not available in this deployment'
    });
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Myl.Zip Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
