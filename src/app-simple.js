const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import encrypted routes
const encryptedRoutes = require('./routes/encrypted');
const deviceRegistrationRoutes = require('./routes/deviceRegistration');

// Mount encrypted routes
app.use('/api/v1/encrypted', encryptedRoutes);

// Mount device registration routes
app.use('/api/v1/encrypted/devices', deviceRegistrationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Myl.Zip Backend Service',
    version: '1.0.0',
    status: 'operational',
    features: {
      endToEndEncryption: true,
      deviceTrust: true,
      crossDeviceSharing: true
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
