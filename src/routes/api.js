const express = require('express');
const thoughtsRoutes = require('./thoughts');
const nftRoutes = require('./nft');

const router = express.Router();

// API versioning
router.use('/v1', (req, res, next) => {
  req.apiVersion = 'v1';
  next();
});

// Mount route modules
router.use('/v1/thoughts', thoughtsRoutes);
router.use('/v1/nft', nftRoutes);

// API info endpoint
router.get('/v1', (req, res) => {
  res.json({
    success: true,
    message: 'Myl.Zip Backend API',
    version: '1.0.0',
    endpoints: {
      thoughts: '/api/v1/thoughts',
      nft: '/api/v1/nft',
      health: '/health',
      metrics: '/metrics',
    },
    documentation: 'https://github.com/XDM-ZSBW/zip-myl-backend#api-documentation',
  });
});

// Backward compatibility - mount v1 routes at root level
router.use('/thoughts', thoughtsRoutes);

module.exports = router;
