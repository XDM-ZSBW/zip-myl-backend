const express = require('express');
const router = express.Router();

// Import route modules for v2
const thoughtsRoutes = require('./thoughts');
const nftRoutes = require('./nft');
const syncRoutes = require('./sync');
const workspaceRoutes = require('./workspace');
const pluginRoutes = require('./plugin');
const deviceRoutes = require('./device');

// API v2 middleware
router.use('/v2', (req, res, next) => {
  req.apiVersion = 'v2';
  req.clientPlatform = req.headers['x-client-platform'] || 'unknown';
  req.clientVersion = req.headers['x-client-version'] || '1.0.0';
  next();
});

// Mount v2 route modules
router.use('/v2/thoughts', thoughtsRoutes);
router.use('/v2/nft', nftRoutes);
router.use('/v2/sync', syncRoutes);
router.use('/v2/workspaces', workspaceRoutes);
router.use('/v2/plugins', pluginRoutes);
router.use('/v2/devices', deviceRoutes);

// API v2 info endpoint
router.get('/v2', (req, res) => {
  res.json({
    success: true,
    message: 'Myl.Zip Backend API v2 - Multi-Client Ecosystem',
    version: '2.0.0',
    supportedProtocols: ['REST', 'WebSocket', 'gRPC', 'GraphQL'],
    endpoints: {
      thoughts: '/api/v2/thoughts',
      nft: '/api/v2/nft',
      sync: '/api/v2/sync',
      workspaces: '/api/v2/workspaces',
      plugins: '/api/v2/plugins',
      devices: '/api/v2/devices',
      health: '/health',
      metrics: '/metrics',
      websocket: '/ws',
      grpc: '/grpc',
      graphql: '/graphql'
    },
    clientPlatforms: {
      web: 'Chrome, Firefox, Safari, Edge Extensions',
      desktop: 'Obsidian, VS Code, Sublime Text, Atom',
      mobile: 'iOS Safari, Android Chrome',
      development: 'JetBrains IDEs, Eclipse, Vim/Neovim',
      enterprise: 'Slack, Discord, Teams'
    },
    documentation: 'https://github.com/XDM-ZSBW/zip-myl-backend#api-v2-documentation',
    changelog: 'https://github.com/XDM-ZSBW/zip-myl-backend#changelog'
  });
});

// Client capability detection endpoint
router.get('/v2/capabilities', (req, res) => {
  const clientPlatform = req.headers['x-client-platform'] || 'unknown';
  const clientVersion = req.headers['x-client-version'] || '1.0.0';
  
  const capabilities = {
    clientPlatform,
    clientVersion,
    supportedFeatures: getClientCapabilities(clientPlatform),
    apiLimits: getApiLimits(clientPlatform),
    recommendedProtocols: getRecommendedProtocols(clientPlatform)
  };
  
  res.json({
    success: true,
    data: capabilities
  });
});

// Get client-specific capabilities
function getClientCapabilities(platform) {
  const capabilities = {
    web: ['markdown', 'real-time-sync', 'offline-storage', 'encryption'],
    desktop: ['file-system', 'native-integration', 'plugin-system', 'offline-first'],
    mobile: ['touch-optimized', 'offline-first', 'push-notifications', 'biometric-auth'],
    development: ['ide-integration', 'workspace-management', 'extension-api', 'debug-support'],
    enterprise: ['ldap-auth', 'audit-logging', 'compliance', 'sso-integration']
  };
  
  return capabilities[platform] || capabilities.web;
}

// Get client-specific API limits
function getApiLimits(platform) {
  const limits = {
    web: { rateLimit: 1000, maxPayload: '10mb', websocket: true },
    desktop: { rateLimit: 500, maxPayload: '50mb', websocket: true },
    mobile: { rateLimit: 200, maxPayload: '5mb', websocket: false },
    development: { rateLimit: 2000, maxPayload: '100mb', websocket: true },
    enterprise: { rateLimit: 5000, maxPayload: '100mb', websocket: true }
  };
  
  return limits[platform] || limits.web;
}

// Get recommended protocols for client
function getRecommendedProtocols(platform) {
  const protocols = {
    web: ['REST', 'WebSocket'],
    desktop: ['REST', 'WebSocket', 'gRPC'],
    mobile: ['REST', 'GraphQL'],
    development: ['REST', 'WebSocket', 'gRPC', 'GraphQL'],
    enterprise: ['REST', 'gRPC', 'SSH/TLS']
  };
  
  return protocols[platform] || protocols.web;
}

module.exports = router;
