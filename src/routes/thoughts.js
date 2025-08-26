import express from 'express';
import { thoughtsController } from '../controllers/thoughtsController.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateRequest, schemas } from '../middleware/validation.js';

const router = express.Router();

// Apply optional authentication to all routes
router.use(optionalAuth);

// GET /api/thoughts - Get thoughts with pagination and filtering
router.get('/', thoughtsController.getThoughts);

// GET /api/thoughts/search - Search thoughts
router.get('/search', thoughtsController.searchThoughts);

// GET /api/thoughts/stats - Get thought statistics
router.get('/stats', thoughtsController.getThoughtStats);

// GET /api/thoughts/:id - Get specific thought
router.get('/:id', validateRequest(schemas.id, 'params'), thoughtsController.getThoughtById);

// POST /api/thoughts - Create new thought
router.post(
  '/',
  validateRequest(schemas.createThought),
  thoughtsController.createThought
);

// PUT /api/thoughts/:id - Update thought
router.put(
  '/:id',
  validateRequest(schemas.id, 'params'),
  validateRequest(schemas.updateThought),
  thoughtsController.updateThought
);

// DELETE /api/thoughts/:id - Delete thought
router.delete(
  '/:id',
  validateRequest(schemas.id, 'params'),
  thoughtsController.deleteThought
);

export default router;
