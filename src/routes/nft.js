const express = require('express');
const { validateExtension } = require('../middleware');
const nftQueueService = require('../services/nftQueueService');
const logger = require('../utils/logger');

const router = express.Router();

// Apply extension validation to all NFT routes
router.use(validateExtension);

/**
 * POST /api/v1/nft/generate
 * Add NFT generation job to queue
 */
router.post('/generate', async(req, res) => {
  try {
    const { style, deviceId, options = {}, pairingCode } = req.body;

    // Validate required fields
    if (!style || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['style', 'deviceId'],
      });
    }

    // Validate style parameter
    const validStyles = ['abstract', 'geometric', 'organic', 'minimal', 'complex'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid style parameter',
        validStyles,
        received: style,
      });
    }

    // Add job to queue
    const jobInfo = await nftQueueService.addNFTGenerationJob(
      style,
      deviceId,
      options,
      pairingCode,
    );

    logger.info(`NFT generation job queued for device ${deviceId}`, { jobId: jobInfo.jobId });

    res.json({
      success: true,
      message: 'NFT generation job queued successfully',
      ...jobInfo,
      nextSteps: [
        'Use the jobId to check status',
        'Monitor progress via /api/v1/nft/status/:jobId',
        'NFT will be generated in background',
      ],
    });
  } catch (error) {
    logger.error('Failed to queue NFT generation:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to queue NFT generation',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * GET /api/v1/nft/status/:jobId
 * Get NFT generation job status
 */
router.get('/status/:jobId', async(req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    const status = await nftQueueService.getJobStatus(jobId);

    if (!status.success) {
      return res.status(404).json(status);
    }

    // Add helpful information based on status
    const statusInfo = getStatusInfo(status.state, status.progress);

    res.json({
      ...status,
      statusInfo,
      actions: getAvailableActions(status.state),
    });
  } catch (error) {
    logger.error('Failed to get NFT job status:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * GET /api/v1/nft/queue/stats
 * Get queue statistics and performance metrics
 */
router.get('/queue/stats', async(req, res) => {
  try {
    const stats = await nftQueueService.getQueueStats();

    if (stats.error) {
      return res.status(503).json({
        success: false,
        error: 'Queue service unavailable',
        message: stats.error,
      });
    }

    res.json({
      success: true,
      message: 'Queue statistics retrieved successfully',
      ...stats,
      recommendations: generateQueueRecommendations(stats),
    });
  } catch (error) {
    logger.error('Failed to get queue stats:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * POST /api/v1/nft/queue/cleanup
 * Clean up old completed and failed jobs
 */
router.post('/queue/cleanup', async(req, res) => {
  try {
    const cleanup = await nftQueueService.cleanupOldJobs();

    res.json({
      success: true,
      message: 'Queue cleanup completed successfully',
      cleanup,
      nextCleanup: 'Automatic cleanup runs every 24 hours',
    });
  } catch (error) {
    logger.error('Failed to cleanup queue:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to cleanup queue',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * POST /api/v1/nft/queue/pause
 * Pause the NFT generation queue
 */
router.post('/queue/pause', async(req, res) => {
  try {
    await nftQueueService.pauseQueue();

    res.json({
      success: true,
      message: 'NFT generation queue paused successfully',
      status: 'paused',
      resumeEndpoint: 'POST /api/v1/nft/queue/resume',
    });
  } catch (error) {
    logger.error('Failed to pause queue:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to pause queue',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * POST /api/v1/nft/queue/resume
 * Resume the NFT generation queue
 */
router.post('/queue/resume', async(req, res) => {
  try {
    await nftQueueService.resumeQueue();

    res.json({
      success: true,
      message: 'NFT generation queue resumed successfully',
      status: 'active',
      pauseEndpoint: 'POST /api/v1/nft/queue/pause',
    });
  } catch (error) {
    logger.error('Failed to resume queue:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to resume queue',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * GET /api/v1/nft/queue/health
 * Check queue health status
 */
router.get('/queue/health', async(req, res) => {
  try {
    const stats = await nftQueueService.getQueueStats();

    if (stats.error) {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Queue service unavailable',
        message: stats.error,
      });
    }

    // Determine health status based on metrics
    const isHealthy = stats.stats.failed < 10 && stats.performance.successRate > 90;

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      queue: {
        isInitialized: nftQueueService.isInitialized,
        stats: stats.stats,
        performance: stats.performance,
      },
      recommendations: isHealthy ? [] : generateHealthRecommendations(stats),
    });
  } catch (error) {
    logger.error('Failed to check queue health:', error);

    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Failed to check queue health',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * GET /api/v1/nft/styles
 * Get available NFT generation styles
 */
router.get('/styles', (req, res) => {
  const styles = [
    {
      id: 'abstract',
      name: 'Abstract',
      description: 'Non-representational artistic style',
      complexity: 'medium',
      estimatedTime: '30-45 seconds',
    },
    {
      id: 'geometric',
      name: 'Geometric',
      description: 'Mathematical shapes and patterns',
      complexity: 'low',
      estimatedTime: '20-30 seconds',
    },
    {
      id: 'organic',
      name: 'Organic',
      description: 'Natural, flowing forms',
      complexity: 'high',
      estimatedTime: '45-60 seconds',
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple, clean designs',
      complexity: 'low',
      estimatedTime: '15-25 seconds',
    },
    {
      id: 'complex',
      name: 'Complex',
      description: 'Intricate, detailed patterns',
      complexity: 'very-high',
      estimatedTime: '60-90 seconds',
    },
  ];

  res.json({
    success: true,
    styles,
    total: styles.length,
    usage: 'Use style ID in POST /api/v1/nft/generate',
  });
});

// Helper functions

/**
 * Generate status information based on job state
 */
function getStatusInfo(state, progress) {
  const statusMap = {
    'waiting': {
      description: 'Job is waiting in queue',
      nextStep: 'Will start processing soon',
      estimatedWait: '5-15 seconds',
    },
    'active': {
      description: 'Job is currently being processed',
      nextStep: 'NFT generation in progress',
      estimatedWait: progress > 0 ? `${Math.round((100 - progress) / progress * 30)} seconds` : '30-60 seconds',
    },
    'completed': {
      description: 'Job completed successfully',
      nextStep: 'NFT is ready',
      estimatedWait: '0 seconds',
    },
    'failed': {
      description: 'Job failed during processing',
      nextStep: 'Check error details and retry if needed',
      estimatedWait: 'N/A',
    },
    'delayed': {
      description: 'Job is scheduled for later execution',
      nextStep: 'Will start at scheduled time',
      estimatedWait: 'Until scheduled time',
    },
  };

  return statusMap[state] || {
    description: 'Unknown job state',
    nextStep: 'Contact support',
    estimatedWait: 'Unknown',
  };
}

/**
 * Get available actions based on job state
 */
function getAvailableActions(state) {
  const actionMap = {
    'waiting': ['cancel', 'check-status'],
    'active': ['check-status', 'view-logs'],
    'completed': ['download', 'view-metadata', 'share'],
    'failed': ['retry', 'view-logs', 'contact-support'],
    'delayed': ['cancel', 'reschedule', 'check-status'],
  };

  return actionMap[state] || ['check-status'];
}

/**
 * Generate queue recommendations based on stats
 */
function generateQueueRecommendations(stats) {
  const recommendations = [];

  if (stats.stats.waiting > 20) {
    recommendations.push('High queue backlog - consider scaling up workers');
  }

  if (stats.stats.failed > 10) {
    recommendations.push('High failure rate - check error logs and system health');
  }

  if (stats.performance.successRate < 95) {
    recommendations.push('Success rate below 95% - investigate recent failures');
  }

  if (stats.performance.averageProcessingTime > 60) {
    recommendations.push('Slow processing - consider optimizing NFT generation');
  }

  if (recommendations.length === 0) {
    recommendations.push('Queue is performing well - no action needed');
  }

  return recommendations;
}

/**
 * Generate health recommendations based on metrics
 */
function generateHealthRecommendations(stats) {
  const recommendations = [];

  if (stats.stats.failed > 10) {
    recommendations.push('Reduce failed jobs by checking error logs');
  }

  if (stats.performance.successRate < 90) {
    recommendations.push('Improve success rate by investigating failures');
  }

  if (stats.stats.waiting > 50) {
    recommendations.push('High queue backlog - consider adding workers');
  }

  return recommendations;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId() {
  return `nft_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;
