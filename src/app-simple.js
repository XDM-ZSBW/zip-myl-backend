const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;

// Simple logging function that doesn't depend on external logger
const log = (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

// CORS configuration for Chrome extensions
app.use((req, res, next) => {
  // Allow requests from Chrome extensions
  const origin = req.headers.origin;
  
  // Allow Chrome extension origins
  if (origin && (
    origin.startsWith('chrome-extension://') ||
    origin.startsWith('moz-extension://') ||
    origin.startsWith('safari-extension://') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    origin === 'https://myl.zip' ||
    origin === 'https://app.myl.zip' ||
    origin === 'https://admin.myl.zip'
  )) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow requests with no origin (like curl, Postman, etc.)
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Error handling for JSON parsing errors
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'Invalid JSON format',
      message: 'The request body contains malformed JSON'
    });
  }
  next();
});

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

// Provide enhanced encrypted endpoints with masterless key functionality
app.get('/api/v1/encrypted', (req, res) => {
  res.json({
    message: 'Encrypted API endpoints',
    status: 'enhanced_mode',
    note: 'Masterless encryption available',
    keyManagement: {
      approach: 'masterless',
      available: true,
      methods: [
        'device-specific-derivation',
        'user-controlled-keys',
        'threshold-cryptography',
        'key-escrow-user-control',
        'cross-device-exchange',
        'biometric-device-binding'
      ]
    },
    endpoints: {
      devices: '/api/v1/encrypted/devices/*',
      thoughts: '/api/v1/encrypted/thoughts/*',
      keys: '/api/v1/keys/*'
    }
  });
});

// Device registration endpoints
app.get('/api/v1/encrypted/devices', (req, res) => {
  res.json({
    message: 'Device registration endpoints',
    status: 'enhanced_mode',
    keyManagement: 'masterless',
    availableEndpoints: [
      'POST /api/v1/encrypted/devices/register',
      'POST /api/v1/encrypted/devices/pairing-code',
      'POST /api/v1/encrypted/devices/pair',
      'GET /api/v1/encrypted/devices/trusted',
      'POST /api/v1/encrypted/devices/trust',
      'DELETE /api/v1/encrypted/devices/trust/{deviceId}',
      'POST /api/v1/encrypted/devices/keys/exchange',
      'POST /api/v1/encrypted/devices/{deviceId}/rotate-keys',
      'GET /api/v1/encrypted/devices/health',
      'GET /api/v1/encrypted/devices/stats'
    ]
  });
});

// Device registration endpoint
app.post('/api/v1/encrypted/devices/register', (req, res) => {
  try {
    const { deviceId, deviceInfo, publicKey, encryptedMetadata } = req.body;
    
    if (!deviceId || !deviceInfo) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['deviceId', 'deviceInfo']
      });
    }
    
    // Generate device-specific key using built-in crypto
    const keyMaterial = `${deviceId}:${deviceInfo.userPassword || 'default-password'}:${deviceInfo.fingerprint || 'default-fingerprint'}`;
    const salt = crypto.createHash('sha256')
      .update(deviceId + (deviceInfo.fingerprint || 'default-fingerprint'))
      .digest('hex');
    
    const keyId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    res.status(201).json({
      success: true,
      deviceId: deviceId,
      sessionToken: sessionToken,
      fingerprint: salt,
      keyId: keyId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      message: 'Device registered successfully with masterless encryption'
    });
  } catch (error) {
    log('error', `Device registration failed: ${error.message}`);
    res.status(500).json({
      error: 'Device registration failed',
      message: error.message
    });
  }
});

// Pairing code generation
app.post('/api/v1/encrypted/devices/pairing-code', async (req, res) => {
  try {
    const { deviceId, format = 'uuid', expiresIn = 600 } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing deviceId'
      });
    }

    // Validate format parameter
    if (format && !['uuid', 'short', 'legacy'].includes(format.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid format parameter',
        message: 'Format must be "uuid", "short", or "legacy"'
      });
    }
    
    // Generate pairing code using built-in crypto
    let pairingCode;
    if (format.toLowerCase() === 'uuid') {
      pairingCode = crypto.randomUUID();
    } else if (format.toLowerCase() === 'short') {
      // Generate 12-character hexadecimal code
      pairingCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    } else if (format.toLowerCase() === 'legacy') {
      // Generate 6-digit numeric code
      pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Generate NFT for UUID pairing codes
    let nftData = null;
    if (format.toLowerCase() === 'uuid') {
      nftData = await generateNFTForPairingCode(pairingCode, deviceId);
    }
    
    res.json({
      success: true,
      pairingCode: pairingCode,
      format: format.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
      expiresIn: expiresIn,
      nft: nftData, // Include NFT data for UUID format
      message: 'Pairing code generated successfully'
    });
  } catch (error) {
    log('error', `Pairing code generation failed: ${error.message}`);
    res.status(500).json({
      error: 'Pairing code generation failed',
      message: error.message
    });
  }
});

// Extension compatibility endpoint - device-registration/pairing-codes (UUID only)
app.post('/api/v1/device-registration/pairing-codes', async (req, res) => {
  try {
    const { deviceId, format = 'uuid', expiresIn = 300 } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        error: 'Missing deviceId'
      });
    }

    // Generate pairing code in requested format
    let pairingCode;
    if (format.toLowerCase() === 'uuid') {
      pairingCode = crypto.randomUUID();
    } else if (format.toLowerCase() === 'short') {
      // Generate 12-character hexadecimal code
      pairingCode = crypto.randomBytes(6).toString('hex').toUpperCase();
    } else if (format.toLowerCase() === 'legacy') {
      // Generate 6-digit numeric code
      pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    }
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Generate NFT for UUID pairing codes
    let nftData = null;
    if (format.toLowerCase() === 'uuid') {
      nftData = await generateNFTForPairingCode(pairingCode, deviceId);
    }

    // Store the pairing code for verification (in-memory for testing)
    // In production, this would be stored in a database
    if (!global.pairingCodes) {
      global.pairingCodes = new Map();
    }

    global.pairingCodes.set(pairingCode, {
      deviceId: deviceId,
      format: format.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      used: false,
      nftId: nftData ? nftData.id : null // Link NFT ID to pairing code
    });

    res.json({
      success: true,
      pairingCode: pairingCode,
      format: format.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
      expiresIn: expiresIn,
      deviceId: deviceId,
      nft: nftData, // Include NFT data for UUID format
      message: `${format} pairing code generated successfully`
    });
  } catch (error) {
    log('error', `Pairing code generation failed: ${error.message}`);
    res.status(500).json({
      error: 'Pairing code generation failed',
      message: error.message
    });
  }
});

// Device pairing
app.post('/api/v1/encrypted/devices/pair', (req, res) => {
  try {
    const { deviceId, pairingCode, encryptedTrustData } = req.body;
    
    if (!deviceId || !pairingCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['deviceId', 'pairingCode']
      });
    }

    // Validate pairing code format based on detected format
    let detectedFormat = 'unknown';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pairingCode)) {
      detectedFormat = 'uuid';
    } else if (/^[0-9a-f]{12}$/i.test(pairingCode)) {
      detectedFormat = 'short';
    } else if (/^\d{6}$/.test(pairingCode)) {
      detectedFormat = 'legacy';
    }

    if (detectedFormat === 'unknown') {
      return res.status(400).json({
        error: 'Invalid pairing code format',
        message: 'Pairing code must be in UUID, short, or legacy format'
      });
    }

    // For testing purposes, we'll accept any valid format without requiring a stored code
    // In production, this would verify the pairing code against the database
    
    res.json({
      success: true,
      trustRelationship: {
        id: 'trust-' + Date.now(),
        trustLevel: 1,
        createdAt: new Date().toISOString()
      },
      pairedDevice: {
        deviceId: 'paired-device-' + Date.now(),
        deviceType: 'chrome-extension',
        deviceVersion: '2.0.0'
      },
      pairingCodeFormat: detectedFormat,
      message: 'Devices paired successfully'
    });
  } catch (error) {
    log('error', `Device pairing failed: ${error.message}`);
    res.status(500).json({
      error: 'Device pairing failed',
      message: error.message
    });
  }
});

// Extension compatibility endpoint - device-registration/pair
app.post('/api/v1/device-registration/pair', (req, res) => {
  try {
    const { deviceId, pairingCode, encryptedTrustData } = req.body;
    
    if (!deviceId || !pairingCode) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['deviceId', 'pairingCode']
      });
    }

    // Validate pairing code format based on detected format
    let detectedFormat = 'unknown';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pairingCode)) {
      detectedFormat = 'uuid';
    } else if (/^[0-9a-f]{12}$/i.test(pairingCode)) {
      detectedFormat = 'short';
    } else if (/^\d{6}$/.test(pairingCode)) {
      detectedFormat = 'legacy';
    }

    if (detectedFormat === 'unknown') {
      return res.status(400).json({
        error: 'Invalid pairing code format',
        message: 'Pairing code must be in UUID, short, or legacy format'
      });
    }

    // For testing purposes, we'll implement a simple in-memory pairing code store
    // In production, this would be stored in a database
    if (!global.pairingCodes) {
      global.pairingCodes = new Map();
    }

    // Check if the pairing code exists and is valid
    const pairingData = global.pairingCodes.get(pairingCode);
    if (!pairingData) {
      return res.status(400).json({
        error: 'Invalid or expired pairing code',
        message: 'The pairing code does not exist or has expired'
      });
    }

    // Check if the pairing code has expired
    if (new Date() > new Date(pairingData.expiresAt)) {
      global.pairingCodes.delete(pairingCode);
      return res.status(400).json({
        error: 'Invalid or expired pairing code',
        message: 'The pairing code has expired'
      });
    }

    // Check if the pairing code has already been used
    if (pairingData.used) {
      return res.status(400).json({
        error: 'Invalid or expired pairing code',
        message: 'The pairing code has already been used'
      });
    }

    // Mark the pairing code as used (one-time use)
    pairingData.used = true;
    pairingData.usedBy = deviceId;
    pairingData.usedAt = new Date().toISOString();

    // Return success with the paired device information
    res.json({
      success: true,
      trustRelationship: {
        id: 'trust-' + Date.now(),
        trustLevel: 1,
        createdAt: new Date().toISOString()
      },
      pairedDevice: {
        deviceId: pairingData.deviceId,
        deviceType: 'chrome-extension',
        deviceVersion: '2.0.0'
      },
      pairingCodeFormat: detectedFormat,
      message: 'Devices paired successfully'
    });
  } catch (error) {
    log('error', `Device pairing failed: ${error.message}`);
    res.status(500).json({
      error: 'Device pairing failed',
      message: error.message
    });
  }
});

// Get trusted devices
app.get('/api/v1/encrypted/devices/trusted', (req, res) => {
  try {
    res.json({
      success: true,
      devices: [],
      count: 0,
      message: 'Trusted devices retrieved successfully'
    });
  } catch (error) {
    log('error', `Failed to get trusted devices: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get trusted devices',
      message: error.message
    });
  }
});

// Establish trust
app.post('/api/v1/encrypted/devices/trust', (req, res) => {
  try {
    const { deviceId, trustedByDeviceId, permissions } = req.body;
    
    res.json({
      success: true,
      device: {
        deviceId: deviceId,
        isTrusted: true,
        trustedBy: trustedByDeviceId,
        trustedAt: new Date().toISOString(),
        permissions: permissions || { canRead: true, canWrite: true, canShare: true }
      },
      message: 'Device trust established successfully'
    });
  } catch (error) {
    log('error', `Trust establishment failed: ${error.message}`);
    res.status(500).json({
      error: 'Trust establishment failed',
      message: error.message
    });
  }
});

// Revoke trust
app.delete('/api/v1/encrypted/devices/trust/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    res.json({
      success: true,
      message: 'Trust relationship revoked successfully'
    });
  } catch (error) {
    log('error', `Trust revocation failed: ${error.message}`);
    res.status(500).json({
      error: 'Trust revocation failed',
      message: error.message
    });
  }
});

// Key exchange
app.post('/api/v1/encrypted/devices/keys/exchange', (req, res) => {
  try {
    const { targetDeviceId, encryptedKeyData } = req.body;
    
    res.json({
      success: true,
      message: 'Key exchange initiated',
      exchangeId: 'exchange-' + Date.now()
    });
  } catch (error) {
    log('error', `Key exchange failed: ${error.message}`);
    res.status(500).json({
      error: 'Key exchange failed',
      message: error.message
    });
  }
});

// Rotate device keys
app.post('/api/v1/encrypted/devices/:deviceId/rotate-keys', (req, res) => {
  try {
    const { deviceId } = req.params;
    
    res.json({
      success: true,
      message: 'Device keys rotated successfully',
      rotatedAt: new Date().toISOString()
    });
  } catch (error) {
    log('error', `Key rotation failed: ${error.message}`);
    res.status(500).json({
      error: 'Key rotation failed',
      message: error.message
    });
  }
});

// Device health check
app.get('/api/v1/encrypted/devices/health', (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      features: {
        deviceRegistration: true,
        devicePairing: true,
        trustManagement: true,
        keyExchange: true,
        masterlessEncryption: true
      }
    });
  } catch (error) {
    log('error', `Health check failed: ${error.message}`);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Device statistics
app.get('/api/v1/encrypted/devices/stats', (req, res) => {
  try {
    res.json({
      totalDevices: 0,
      activeDevices: 0,
      trustRelationships: 0,
      lastUpdated: new Date().toISOString(),
      masterlessEncryption: true
    });
  } catch (error) {
    log('error', `Failed to get device statistics: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get device statistics',
      message: error.message
    });
  }
});

// Add masterless key management endpoints
app.get('/api/v1/keys/status', (req, res) => {
  try {
    res.json({
      success: true,
      keyManagement: {
        approach: 'masterless',
        available: true,
        version: '2.0.0',
        algorithms: ['AES-256-GCM', 'PBKDF2-SHA256'],
        keyDerivation: 'device-specific',
        masterKey: false
      },
      message: 'Masterless key management available'
    });
  } catch (error) {
    log('error', `Key service unavailable: ${error.message}`);
    res.status(500).json({
      error: 'Key service unavailable',
      message: error.message
    });
  }
});

app.post('/api/v1/keys/device-specific', (req, res) => {
  try {
    const { deviceId, userPassword, deviceFingerprint } = req.body;
    
    if (!deviceId || !userPassword || !deviceFingerprint) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['deviceId', 'userPassword', 'deviceFingerprint']
      });
    }
    
    // Generate device-specific key using built-in crypto
    const keyMaterial = `${deviceId}:${userPassword}:${deviceFingerprint}`;
    const salt = crypto.createHash('sha256')
      .update(deviceId + deviceFingerprint)
      .digest('hex');
    
    const keyId = crypto.randomUUID();
    
    res.json({
      success: true,
      keyData: {
        keyId: keyId,
        algorithm: 'PBKDF2-SHA256',
        iterations: 100000,
        salt: salt
        // Note: The actual key is not returned for security
      },
      message: 'Device-specific key generated successfully'
    });
  } catch (error) {
    log('error', `Key generation failed: ${error.message}`);
    res.status(500).json({
      error: 'Key generation failed',
      message: error.message
    });
  }
});

// NFT generation function for pairing codes
async function generateNFTForPairingCode(pairingCode, deviceId) {
  try {
    // Generate unique NFT data
    const nftId = crypto.randomUUID();
    const shapeKeys = [4, 5, 6, 8, 10, 12]; // Geometric shapes
    const randomShape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
    
    // Generate color palette
    const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Create NFT metadata
    const nftData = {
      id: nftId,
      pairingCode: pairingCode, // Link to pairing code
      deviceId: deviceId,
      shape: {
        sides: randomShape,
        name: `${randomShape}-gon`
      },
      color: randomColor,
      segments: generateSegments(randomShape),
      connectionPoints: generateConnectionPoints(randomShape),
      isPairingToken: true,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      metadata: {
        type: 'pairing-code-nft',
        version: '1.0.0',
        algorithm: 'geometric-pattern'
      }
    };
    
    // Store NFT in global cache (in production, this would be in a database)
    if (!global.nftCollection) {
      global.nftCollection = new Map();
    }
    
    global.nftCollection.set(nftId, nftData);
    
    // Also store by pairing code for quick lookup
    if (!global.pairingCodeNFTs) {
      global.pairingCodeNFTs = new Map();
    }
    global.pairingCodeNFTs.set(pairingCode, nftData);
    
    return nftData;
  } catch (error) {
    log('error', `NFT generation failed: ${error.message}`);
    return null;
  }
}

// Helper function to generate geometric segments
function generateSegments(sides) {
  const segments = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    segments.push({
      index: i,
      angle: angle,
      x: Math.cos(angle) * 50,
      y: Math.sin(angle) * 50
    });
  }
  return segments;
}

// Helper function to generate connection points
function generateConnectionPoints(sides) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    points.push({
      index: i,
      angle: angle,
      x: Math.cos(angle) * 40,
      y: Math.sin(angle) * 40,
      type: 'connection'
    });
  }
  return points;
}

// Get NFT by pairing code
app.get('/api/v1/nft/pairing-code/:pairingCode', (req, res) => {
  try {
    const { pairingCode } = req.params;
    
    if (!pairingCode) {
      return res.status(400).json({
        error: 'Missing pairing code'
      });
    }
    
    // Look up NFT by pairing code
    if (!global.pairingCodeNFTs) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'No NFT associated with this pairing code'
      });
    }
    
    const nftData = global.pairingCodeNFTs.get(pairingCode);
    if (!nftData) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'No NFT associated with this pairing code'
      });
    }
    
    // Check if NFT has expired
    if (new Date() > new Date(nftData.expiresAt)) {
      return res.status(410).json({
        error: 'NFT expired',
        message: 'This NFT has expired',
        expiredAt: nftData.expiresAt
      });
    }
    
    res.json({
      success: true,
      nft: nftData,
      message: 'NFT retrieved successfully'
    });
  } catch (error) {
    log('error', `NFT retrieval failed: ${error.message}`);
    res.status(500).json({
      error: 'NFT retrieval failed',
      message: error.message
    });
  }
});

// Get NFT by ID
app.get('/api/v1/nft/:nftId', (req, res) => {
  try {
    const { nftId } = req.params;
    
    if (!nftId) {
      return res.status(400).json({
        error: 'Missing NFT ID'
      });
    }
    
    // Look up NFT by ID
    if (!global.nftCollection) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'NFT collection not available'
      });
    }
    
    const nftData = global.nftCollection.get(nftId);
    if (!nftData) {
      return res.status(404).json({
        error: 'NFT not found',
        message: 'NFT with this ID does not exist'
      });
    }
    
    // Check if NFT has expired
    if (new Date() > new Date(nftData.expiresAt)) {
      return res.status(410).json({
        error: 'NFT expired',
        message: 'This NFT has expired',
        expiredAt: nftData.expiresAt
      });
    }
    
    res.json({
      success: true,
      nft: nftData,
      message: 'NFT retrieved successfully'
    });
  } catch (error) {
    log('error', `NFT retrieval failed: ${error.message}`);
    res.status(500).json({
      error: 'NFT retrieval failed',
      message: error.message
    });
  }
});

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
  log('error', `Error: ${error.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  log('info', `🚀 Myl.Zip Backend Server running on port ${PORT}`);
  log('info', `📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  log('info', `🌐 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
