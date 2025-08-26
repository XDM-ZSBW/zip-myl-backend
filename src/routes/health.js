import express from 'express';
import { healthController } from '../controllers/healthController.js';

const router = express.Router();

// GET /health - Comprehensive health check
router.get('/', healthController.healthCheck);

// GET /health/ready - Kubernetes readiness probe
router.get('/ready', healthController.readinessCheck);

// GET /health/live - Kubernetes liveness probe
router.get('/live', healthController.livenessCheck);

export default router;
