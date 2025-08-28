const { thoughtService } = require('../services/thoughtService');
const { logger } = require('../utils/logger');

const createThought = async(req, res, next) => {
  try {
    const { content, metadata, url, userId } = req.body;

    // Use authenticated user ID if available, otherwise use provided userId
    const finalUserId = req.user?.id || userId;

    const thought = await thoughtService.createThought({
      content,
      metadata,
      url,
      userId: finalUserId,
    });

    logger.info(`Thought created: ${thought.id} by user: ${finalUserId || 'anonymous'}`);

    res.status(201).json({
      success: true,
      data: thought.toJSON(),
      message: 'Thought created successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getThoughts = async(req, res, next) => {
  try {
    const { page, limit, sortBy, sortOrder, url, userId } = req.query;

    // Use authenticated user ID if available and no specific userId requested
    const finalUserId = req.user?.id || userId;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      url,
      userId: finalUserId,
    };

    let result;
    if (finalUserId) {
      result = await thoughtService.getUserThoughts(finalUserId, options);
    } else {
      result = await thoughtService.getAllThoughts(options);
    }

    res.json({
      success: true,
      data: result.thoughts.map(thought => thought.toJSON()),
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getThoughtById = async(req, res, next) => {
  try {
    const { id } = req.params;

    const thought = await thoughtService.getThoughtById(id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        error: 'Thought not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: thought.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

const updateThought = async(req, res, next) => {
  try {
    const { id } = req.params;
    const { content, metadata, url } = req.body;

    const thought = await thoughtService.getThoughtById(id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        error: 'Thought not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user owns the thought (if authentication is enabled)
    if (req.user && thought.userId && thought.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    const updatedThought = await thoughtService.updateThought(id, {
      content,
      metadata,
      url,
    });

    logger.info(`Thought updated: ${id} by user: ${req.user?.id || 'anonymous'}`);

    res.json({
      success: true,
      data: updatedThought.toJSON(),
      message: 'Thought updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

const deleteThought = async(req, res, next) => {
  try {
    const { id } = req.params;

    const thought = await thoughtService.getThoughtById(id);

    if (!thought) {
      return res.status(404).json({
        success: false,
        error: 'Thought not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user owns the thought (if authentication is enabled)
    if (req.user && thought.userId && thought.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    }

    await thoughtService.deleteThought(id);

    logger.info(`Thought deleted: ${id} by user: ${req.user?.id || 'anonymous'}`);

    res.json({
      success: true,
      message: 'Thought deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const searchThoughts = async(req, res, next) => {
  try {
    const { q: query, page, limit, userId } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Use authenticated user ID if available
    const finalUserId = req.user?.id || userId;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      userId: finalUserId,
    };

    const result = await thoughtService.searchThoughts(query, options);

    res.json({
      success: true,
      data: result.thoughts.map(thought => thought.toJSON()),
      pagination: result.pagination,
      query: result.query,
    });
  } catch (error) {
    next(error);
  }
};

const getThoughtStats = async(req, res, next) => {
  try {
    const stats = await thoughtService.getThoughtStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createThought,
  getThoughts,
  getThoughtById,
  updateThought,
  deleteThought,
  searchThoughts,
  getThoughtStats,
};
