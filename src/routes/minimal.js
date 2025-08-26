const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ 
    message: 'Minimal test route working!',
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent') || 'unknown'
  });
});

module.exports = router;
