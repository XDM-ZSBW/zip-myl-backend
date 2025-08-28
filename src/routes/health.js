const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

// GET /health - Comprehensive health check
router.get('/', healthController.healthCheck);

// GET /health/ready - Kubernetes readiness probe
router.get('/ready', healthController.readinessCheck);

// GET /health/live - Kubernetes liveness probe
router.get('/live', healthController.livenessCheck);

module.exports = router;
