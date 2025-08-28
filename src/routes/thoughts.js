const express = require('express');
const thoughtsController = require('../controllers/thoughtsController');
const { authenticateDeviceOptional } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// Apply optional authentication to all routes
router.use(authenticateDeviceOptional);

// GET /api/thoughts - Get thoughts with pagination and filtering
router.get('/', thoughtsController.getThoughts);

// GET /api/thoughts/search - Search thoughts
router.get('/search', thoughtsController.searchThoughts);

// GET /api/thoughts/stats - Get thought statistics
router.get('/stats', thoughtsController.getThoughtStats);

// GET /api/thoughts/:id - Get specific thought
router.get('/:id', validate(schemas.id, 'params'), thoughtsController.getThoughtById);

// POST /api/thoughts - Create new thought
router.post(
  '/',
  validate(schemas.createThought),
  thoughtsController.createThought,
);

// PUT /api/thoughts/:id - Update thought
router.put(
  '/:id',
  validate(schemas.id, 'params'),
  validate(schemas.updateThought),
  thoughtsController.updateThought,
);

// DELETE /api/thoughts/:id - Delete thought
router.delete(
  '/:id',
  validate(schemas.id, 'params'),
  thoughtsController.deleteThought,
);

module.exports = router;
