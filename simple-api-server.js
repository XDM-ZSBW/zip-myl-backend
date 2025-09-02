const express = require('express');
const cors = require('cors');

console.log('🚀 Starting chat API server...');

try {
  const app = express();

  // Basic middleware
  app.use(cors({
    origin: ['http://localhost:8080', 'chrome-extension://*', 'moz-extension://*', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-ID', 'Origin', 'X-Requested-With', 'Accept']
  }));
  
  // Additional CORS headers for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Device-ID, Origin, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.use(express.json());

  console.log('✅ Middleware configured');

  // Chat session management
  const chatSessions = new Map();
  const deviceConnections = new Map();
  const messageHistory = [];
  const registeredDevices = new Map();

  console.log('✅ Chat session management initialized');

  // Device registration endpoint
  app.post('/api/v1/device/register', (req, res) => {
    const { deviceType, userAgent } = req.body;
    
    // Generate a unique device ID
    const deviceId = `${deviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store device information
    registeredDevices.set(deviceId, {
      deviceType: deviceType,
      userAgent: userAgent,
      registeredAt: new Date().toISOString(),
      lastSeen: new Date().toISOString()
    });
    
    console.log(`📱 Device registered: ${deviceId} (${deviceType})`);
    
    res.json({
      success: true,
      deviceId: deviceId,
      message: 'Device registered successfully'
    });
  });

  // Device verification endpoint
  app.post('/api/v1/device/verify', (req, res) => {
    const { deviceId, verifySetup } = req.body;
    const apiKey = req.headers['x-api-key'];
    
    // For now, accept any device ID and API key for testing
    // In production, this would verify against a database
    const isVerified = deviceId && apiKey;
    
    console.log(`🔍 Device verification: ${deviceId} - ${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
    
    res.json({
      success: true,
      data: {
        verified: isVerified,
        deviceId: deviceId,
        setupComplete: verifySetup ? isVerified : true
      }
    });
  });

  // Simple chat endpoints
  app.get('/chat/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      message: 'Chat API is running',
      timestamp: new Date().toISOString(),
      connectedDevices: deviceConnections.size,
      activeSessions: chatSessions.size
    });
  });

  app.get('/chat/devices', (req, res) => {
    const devices = Array.from(deviceConnections.keys()).map(deviceId => ({
      id: deviceId,
      type: deviceId.includes('chrome') ? 'extension' : 'web',
      status: 'active',
      lastSeen: new Date().toISOString()
    }));
    
    res.json({
      devices: devices,
      totalDevices: devices.length
    });
  });

  app.post('/chat/broadcast', (req, res) => {
    const { message, sourceDeviceId } = req.body;
    
    if (!message || !sourceDeviceId) {
      return res.status(400).json({
        error: 'Missing required fields: message and sourceDeviceId'
      });
    }
    
    const broadcastMessage = {
      id: Date.now().toString(),
      message: message,
      sourceDeviceId: sourceDeviceId,
      timestamp: new Date().toISOString(),
      type: 'broadcast'
    };
    
    // Store message in history
    messageHistory.push(broadcastMessage);
    
    // Keep only last 100 messages
    if (messageHistory.length > 100) {
      messageHistory.shift();
    }
    
    console.log(`📡 Broadcasting message from ${sourceDeviceId}: ${message}`);
    console.log(`📊 Connected devices: ${deviceConnections.size}`);
    
    // Broadcast to all connected devices
    deviceConnections.forEach((clientRes, clientDeviceId) => {
      try {
        // Don't send the message back to the sender
        if (clientDeviceId !== sourceDeviceId) {
          const broadcastData = {
            type: 'broadcast',
            ...broadcastMessage
          };
          clientRes.write(`data: ${JSON.stringify(broadcastData)}\n\n`);
          console.log(`📤 Sent to ${clientDeviceId}:`, broadcastData);
        } else {
          console.log(`🚫 Skipping sender ${clientDeviceId}`);
        }
      } catch (error) {
        console.error(`❌ Error sending to ${clientDeviceId}:`, error);
        // Remove dead connection
        deviceConnections.delete(clientDeviceId);
      }
    });
    
    res.json({
      success: true,
      message: 'Message broadcasted successfully',
      broadcastId: broadcastMessage.id,
      totalMessages: messageHistory.length,
      sentTo: deviceConnections.size - 1 // Exclude sender
    });
  });

  app.get('/chat/history/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    
    // Return recent messages (last 50)
    const recentMessages = messageHistory.slice(-50);
    
    res.json({
      deviceId: deviceId,
      messages: recentMessages,
      totalMessages: recentMessages.length
    });
  });

  app.get('/chat/stream/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    
    console.log(`📡 Stream started for device: ${deviceId}`);
    
    // Store device connection
    deviceConnections.set(deviceId, res);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Send recent messages
    const recentMessages = messageHistory.slice(-10);
    recentMessages.forEach(msg => {
      res.write(`data: ${JSON.stringify({
        type: 'broadcast',
        ...msg
      })}\n\n`);
    });
    
    // Keep connection alive and send updates
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        type: 'ping', 
        timestamp: Date.now(),
        deviceId: deviceId
      })}\n\n`);
    }, 30000);
    
    req.on('close', () => {
      clearInterval(interval);
      deviceConnections.delete(deviceId);
      console.log(`📡 Stream closed for device: ${deviceId}`);
    });
  });

  app.post('/chat/suggestions/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const { context } = req.body;
    
    const suggestions = [
      "How can I help you with SSL certificates?",
      "Would you like to learn about MyKeys.zip integration?",
      "Need help with API key generation?",
      "Want to know about our USB device offer?",
      "How's your device setup going?"
    ];
    
    res.json({
      deviceId: deviceId,
      suggestions: suggestions,
      context: context || 'general'
    });
  });

  // API-only middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/chat/') || req.path.startsWith('/api/v1/device/')) {
      next();
    } else {
      res.status(404).json({
        error: 'API_ENDPOINT_NOT_FOUND',
        message: 'This is a chat API service. Use /chat/ or /api/v1/device/ endpoints.',
        availableEndpoints: [
          '/api/v1/device/register',
          '/api/v1/device/verify',
          '/chat/health',
          '/chat/devices',
          '/chat/broadcast',
          '/chat/history/:deviceId',
          '/chat/stream/:deviceId',
          '/chat/suggestions/:deviceId'
        ]
      });
    }
  });

  console.log('✅ All routes configured');

  const PORT = 3333;
  app.listen(PORT, () => {
    console.log(`🚀 Chat API server running on port ${PORT}`);
    console.log(`📡 Available endpoints:`);
    console.log(`   POST /api/v1/device/register`);
    console.log(`   POST /api/v1/device/verify`);
    console.log(`   GET  /chat/health`);
    console.log(`   GET  /chat/devices`);
    console.log(`   POST /chat/broadcast`);
    console.log(`   GET  /chat/history/:deviceId`);
    console.log(`   GET  /chat/stream/:deviceId`);
    console.log(`   POST /chat/suggestions/:deviceId`);
    console.log(`🌐 CORS enabled for localhost:8080 and Chrome extensions`);
  });

} catch (error) {
  console.error('❌ Error starting server:', error);
  process.exit(1);
}
