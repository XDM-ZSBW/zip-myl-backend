const express = require('express');
const { thoughtsController } = require('../controllers/thoughtsController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');

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

module.exports = router;
