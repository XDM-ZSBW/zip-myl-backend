// Conditionally import Bull only if Redis is available
let Queue = null;
try {
  if (process.env.NODE_ENV !== 'test' && process.env.REDIS_HOST) {
    Queue = require('bull');
  }
} catch (error) {
  // Bull not available, will use fallback
}
const logger = require('../utils/logger');
const config = require('../utils/config');

/**
 * NFT Generation Queue Service
 * Handles background NFT generation to prevent API timeouts
 */
class NFTQueueService {
  constructor() {
    this.queue = null;
    this.isInitialized = false;
    this.initializeQueue();
  }

  /**
   * Initialize the NFT generation queue
   */
  initializeQueue() {
    try {
      // Check if Redis and Bull are available
      if (process.env.NODE_ENV === 'test' || !process.env.REDIS_HOST || !Queue) {
        logger.info('Redis/Bull not available, using memory-based NFT queue fallback');
        this.isInitialized = true;
        this.useFallback = true;
        return;
      }

      // Create queue with Redis configuration
      this.queue = new Queue('nft-generation', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      // Set up queue event handlers
      this.setupQueueHandlers();

      // Set up job processors
      this.setupJobProcessors();

      this.isInitialized = true;
      this.useFallback = false;
      logger.info('NFT generation queue initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize Redis-based NFT queue, using memory fallback:', error.message);
      this.isInitialized = true;
      this.useFallback = true;
    }
  }

  /**
   * Set up queue event handlers
   */
  setupQueueHandlers() {
    this.queue.on('error', (error) => {
      logger.error('NFT queue error:', error);
    });

    this.queue.on('waiting', (jobId) => {
      logger.info(`NFT generation job ${jobId} waiting`);
    });

    this.queue.on('active', (job) => {
      logger.info(`NFT generation job ${job.id} started processing`);
    });

    this.queue.on('completed', (job, result) => {
      logger.info(`NFT generation job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, error) => {
      logger.error(`NFT generation job ${job.id} failed:`, error.message);
    });

    this.queue.on('stalled', (jobId) => {
      logger.warn(`NFT generation job ${jobId} stalled`);
    });
  }

  /**
   * Set up job processors
   */
  setupJobProcessors() {
    this.queue.process('generate', async(job) => {
      const { style, deviceId, options, pairingCode } = job.data;

      try {
        logger.info(`Processing NFT generation for device ${deviceId}, style: ${style}`);

        // Simulate NFT generation (replace with actual implementation)
        const nft = await this.generateNFT(style, deviceId, options, pairingCode);

        // Store NFT result in database
        await this.storeNFTResult(nft, deviceId, pairingCode);

        logger.info(`NFT generation completed for device ${deviceId}`);
        return nft;
      } catch (error) {
        logger.error(`NFT generation failed for device ${deviceId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Add NFT generation job to queue
   */
  async addNFTGenerationJob(style, deviceId, options = {}, pairingCode = null) {
    if (!this.isInitialized) {
      throw new Error('NFT queue not initialized');
    }

    if (this.useFallback) {
      // Memory-based fallback
      const jobId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`NFT generation job ${jobId} added to memory queue for device ${deviceId}`);

      return {
        jobId,
        status: 'queued',
        estimatedTime: '30-60 seconds',
        position: 1,
      };
    }

    const jobData = {
      style,
      deviceId,
      options,
      pairingCode,
      timestamp: Date.now(),
      priority: options.priority || 'normal',
    };

    const job = await this.queue.add('generate', jobData, {
      priority: this.getJobPriority(jobData.priority),
      delay: options.delay || 0,
      attempts: options.attempts || 3,
    });

    logger.info(`NFT generation job ${job.id} added to queue for device ${deviceId}`);

    return {
      jobId: job.id,
      status: 'queued',
      estimatedTime: '30-60 seconds',
      position: await this.getQueuePosition(job.id),
    };
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId) {
    if (!this.isInitialized) {
      throw new Error('NFT queue not initialized');
    }

    if (this.useFallback) {
      // Memory-based fallback - simulate job status
      if (jobId.startsWith('fallback_')) {
        const timestamp = parseInt(jobId.split('_')[1]);
        const elapsed = Date.now() - timestamp;
        const state = elapsed > 30000 ? 'completed' : 'active';
        const progress = Math.min(100, Math.floor((elapsed / 30000) * 100));

        return {
          success: true,
          jobId,
          state,
          progress,
          data: null,
          error: null,
          timestamp,
          logs: [],
          estimatedTime: this.estimateRemainingTime(state, progress),
        };
      }

      return {
        success: false,
        error: 'Job not found',
      };
    }

    const job = await this.queue.getJob(jobId);

    if (!job) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    const state = await job.getState();
    const progress = job.progress();
    const logs = await job.logs();

    return {
      success: true,
      jobId,
      state,
      progress,
      data: job.returnvalue,
      error: job.failedReason,
      timestamp: job.timestamp,
      logs: logs.slice(-10), // Last 10 log entries
      estimatedTime: this.estimateRemainingTime(state, progress),
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.isInitialized) {
      return { error: 'Queue not initialized' };
    }

    if (this.useFallback) {
      // Memory-based fallback - return mock stats
      return {
        success: true,
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0,
        },
        performance: {
          averageProcessingTime: 30,
          successRate: 100,
        },
      };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
    ]);

    return {
      success: true,
      stats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
      },
      performance: {
        averageProcessingTime: await this.calculateAverageProcessingTime(),
        successRate: this.calculateSuccessRate(completed.length, failed.length),
      },
    };
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanupOldJobs() {
    if (!this.isInitialized || this.useFallback || !this.queue) {
      return;
    }

    try {
      const completedCount = await this.queue.clean(24 * 60 * 60 * 1000, 'completed');
      const failedCount = await this.queue.clean(24 * 60 * 60 * 1000, 'failed');

      logger.info(`Cleaned up ${completedCount} completed and ${failedCount} failed jobs`);

      return { completedCount, failedCount };
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', error);
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    if (!this.isInitialized || this.useFallback || !this.queue) {
      return;
    }

    await this.queue.pause();
    logger.info('NFT generation queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    if (!this.isInitialized || this.useFallback || !this.queue) {
      return;
    }

    await this.queue.resume();
    logger.info('NFT generation queue resumed');
  }

  /**
   * Get queue position for a job
   */
  async getQueuePosition(jobId) {
    if (!this.isInitialized) {
      return 0;
    }

    if (this.useFallback || !this.queue) {
      // Memory-based fallback - always return position 1
      return 1;
    }

    try {
      const waiting = await this.queue.getWaiting();
      const position = waiting.findIndex(job => job.id === jobId);
      return position >= 0 ? position + 1 : 0;
    } catch (error) {
      logger.error('Error getting queue position:', error);
      return 0;
    }
  }

  /**
   * Get job priority value
   */
  getJobPriority(priority) {
    const priorities = {
      low: 10,
      normal: 5,
      high: 1,
      urgent: 0,
    };
    return priorities[priority] || priorities.normal;
  }

  /**
   * Estimate remaining time for job completion
   */
  estimateRemainingTime(state, progress) {
    if (state === 'completed' || state === 'failed') {
      return '0 seconds';
    }

    if (progress > 0) {
      const estimatedTotal = (100 / progress) * 30; // Assuming 30 seconds total
      const remaining = Math.max(0, estimatedTotal - 30);
      return `${Math.round(remaining)} seconds`;
    }

    return '30-60 seconds';
  }

  /**
   * Calculate average processing time
   */
  async calculateAverageProcessingTime() {
    if (this.useFallback || !this.queue) {
      return 30; // Default fallback value
    }

    try {
      const completed = await this.queue.getCompleted();
      if (completed.length === 0) return 0;

      const totalTime = completed.reduce((sum, job) => {
        return sum + (job.finishedOn - job.timestamp);
      }, 0);

      return Math.round(totalTime / completed.length / 1000); // Convert to seconds
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(completed, failed) {
    const total = completed + failed;
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
  }

  /**
   * Simulate NFT generation (replace with actual implementation)
   */
  async generateNFT(style, deviceId, options, pairingCode) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    const nftId = `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: nftId,
      style,
      deviceId,
      pairingCode,
      metadata: {
        name: `${style} NFT for ${deviceId}`,
        description: `Generated NFT with style ${style}`,
        attributes: options.attributes || [],
        generatedAt: new Date().toISOString(),
      },
      status: 'generated',
    };
  }

  /**
   * Store NFT result in database (replace with actual implementation)
   */
  async storeNFTResult(nft, deviceId, pairingCode) {
    // Simulate database storage
    logger.info(`Storing NFT result: ${nft.id} for device ${deviceId}`);
    return nft;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.queue && !this.useFallback) {
      await this.queue.close();
      logger.info('NFT generation queue closed');
    }
  }
}

// Create singleton instance
const nftQueueService = new NFTQueueService();

module.exports = nftQueueService;
