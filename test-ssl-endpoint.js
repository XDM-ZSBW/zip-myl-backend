const express = require('express');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-ID', 'Origin', 'X-Requested-With', 'Accept'],
}));

// Test SSL setup wizard endpoint
app.post('/api/v1/ssl/setup-wizard/provision', (req, res) => {
  console.log('🔒 SSL Provision Request:', req.body);
  
  try {
    const { deviceId, uuidSubdomain, userInitials, deviceName } = req.body;
    
    // Validate required fields
    if (!deviceId || !uuidSubdomain || !userInitials || !deviceName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['deviceId', 'uuidSubdomain', 'userInitials', 'deviceName'],
        received: req.body
      });
    }
    
    // Mock successful response
    res.json({
      success: true,
      data: {
        deviceId,
        uuidSubdomain,
        userInitials,
        deviceName,
        certificateStatus: 'provisioned',
        timestamp: new Date().toISOString()
      },
      message: 'SSL certificate provisioned successfully for setup wizard'
    });
    
  } catch (error) {
    console.error('❌ SSL Provision Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test API key generation endpoint
app.post('/api/v1/ssl/setup-wizard/generate-key', (req, res) => {
  console.log('🔑 API Key Generation Request:', req.body);
  
  try {
    const { deviceId, deviceName, userInitials } = req.body;
    
    // Validate required fields
    if (!deviceId || !deviceName || !userInitials) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['deviceId', 'deviceName', 'userInitials'],
        received: req.body
      });
    }
    
    // Mock API key generation
    const apiKey = 'test_api_key_' + Math.random().toString(36).substring(2, 15);
    
    res.json({
      success: true,
      data: {
        apiKey,
        deviceId,
        deviceName,
        userInitials,
        timestamp: new Date().toISOString()
      },
      message: 'API key generated successfully for setup wizard'
    });
    
  } catch (error) {
    console.error('❌ API Key Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'MyL.Zip API Test Server',
      version: '1.0.0'
    },
    message: 'Service is healthy'
  });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔒 SSL Provision: http://localhost:${PORT}/api/v1/ssl/setup-wizard/provision`);
  console.log(`🔑 API Key Generation: http://localhost:${PORT}/api/v1/ssl/setup-wizard/generate-key`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/api/v1/health`);
});
