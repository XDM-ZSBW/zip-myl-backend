const express = require('express');
const { validateExtension } = require('../middleware');
const { logger } = require('../utils/logger');
const { validateBatchOperations } = require('../middleware/validation');

const router = express.Router();

// Apply extension validation to all batch routes
router.use(validateExtension);

/**
 * POST /api/v1/batch
 * Execute multiple operations in a single request
 */
router.post('/', validateBatchOperations, async(req, res) => {
  try {
    const { operations, options = {} } = req.body;
    const startTime = Date.now();

    logger.info(`Batch operation started with ${operations.length} operations`, {
      deviceId: req.deviceId,
      extensionId: req.extensionId,
      operationCount: operations.length,
    });

    // Execute operations with concurrency control
    const results = await executeBatchOperations(operations, options, req);

    const executionTime = Date.now() - startTime;

    // Generate summary
    const summary = generateBatchSummary(results, executionTime);

    logger.info(`Batch operation completed in ${executionTime}ms`, {
      deviceId: req.deviceId,
      successCount: summary.successCount,
      failureCount: summary.failureCount,
      executionTime,
    });

    res.json({
      success: true,
      message: 'Batch operations completed',
      summary,
      results,
      metadata: {
        totalOperations: operations.length,
        executionTime: `${executionTime}ms`,
        completedAt: new Date().toISOString(),
        deviceId: req.deviceId,
        extensionId: req.extensionId,
      },
    });
  } catch (error) {
    logger.error('Batch operation failed:', error);

    res.status(500).json({
      success: false,
      error: 'Batch operation failed',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * GET /api/v1/batch/supported-operations
 * Get list of supported batch operations
 */
router.get('/supported-operations', (req, res) => {
  const supportedOperations = [
    {
      operation: 'pairing-code.generate',
      description: 'Generate multiple pairing codes',
      endpoint: 'POST /api/v1/device-registration/pairing-codes',
      parameters: ['deviceId', 'format', 'expiresIn'],
      maxBatchSize: 5,
    },
    {
      operation: 'device.register',
      description: 'Register multiple devices',
      endpoint: 'POST /api/v1/encrypted/devices/register',
      parameters: ['deviceId', 'deviceInfo', 'publicKey'],
      maxBatchSize: 3,
    },
    {
      operation: 'nft.generate',
      description: 'Generate multiple NFTs',
      endpoint: 'POST /api/v1/nft/generate',
      parameters: ['style', 'deviceId', 'options'],
      maxBatchSize: 10,
    },
    {
      operation: 'thoughts.sync',
      description: 'Sync multiple thoughts',
      endpoint: 'POST /api/v1/thoughts/sync',
      parameters: ['thoughts'],
      maxBatchSize: 50,
    },
    {
      operation: 'trust.establish',
      description: 'Establish multiple trust relationships',
      endpoint: 'POST /api/v1/encrypted/devices/trust',
      parameters: ['trustData'],
      maxBatchSize: 10,
    },
  ];

  res.json({
    success: true,
    supportedOperations,
    total: supportedOperations.length,
    usage: 'Use operation names in batch requests',
    limits: {
      maxOperationsPerBatch: 50,
      maxConcurrentOperations: 10,
      timeout: '30 seconds',
    },
  });
});

/**
 * GET /api/v1/batch/status/:batchId
 * Get status of a batch operation (for long-running batches)
 */
router.get('/status/:batchId', async(req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: 'Batch ID is required',
      });
    }

    // In a real implementation, you'd store batch status in database
    // For now, we'll return a mock status
    const batchStatus = await getBatchStatus(batchId);

    if (!batchStatus) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found',
      });
    }

    res.json({
      success: true,
      batchId,
      ...batchStatus,
    });
  } catch (error) {
    logger.error('Failed to get batch status:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to get batch status',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

/**
 * POST /api/v1/batch/validate
 * Validate batch operations without executing them
 */
router.post('/validate', validateBatchOperations, (req, res) => {
  try {
    const { operations } = req.body;

    const validationResults = operations.map((operation, index) => {
      const validation = validateSingleOperation(operation, index);
      return {
        index,
        operation: operation.operation,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    });

    const isValid = validationResults.every(result => result.valid);
    const totalErrors = validationResults.reduce((sum, result) => sum + result.errors.length, 0);
    const totalWarnings = validationResults.reduce((sum, result) => sum + result.warnings.length, 0);

    res.json({
      success: true,
      valid: isValid,
      validationResults,
      summary: {
        totalOperations: operations.length,
        validOperations: validationResults.filter(r => r.valid).length,
        totalErrors,
        totalWarnings,
      },
      nextSteps: isValid ?
        ['Operations are valid', 'Proceed with POST /api/v1/batch'] :
        ['Fix validation errors', 'Re-run validation'],
    });
  } catch (error) {
    logger.error('Batch validation failed:', error);

    res.status(500).json({
      success: false,
      error: 'Batch validation failed',
      message: error.message,
      errorId: generateErrorId(),
    });
  }
});

// Helper functions

/**
 * Execute batch operations with concurrency control
 */
async function executeBatchOperations(operations, options, req) {
  const { maxConcurrency = 5, timeout = 30000 } = options;
  const results = [];

  // Group operations by type for better concurrency
  const operationGroups = groupOperationsByType(operations);

  for (const [operationType, ops] of Object.entries(operationGroups)) {
    logger.info(`Processing ${ops.length} operations of type: ${operationType}`);

    // Execute operations in parallel with concurrency limit
    const groupResults = await executeOperationGroup(ops, maxConcurrency, timeout, req);
    results.push(...groupResults);
  }

  return results;
}

/**
 * Group operations by type for efficient processing
 */
function groupOperationsByType(operations) {
  const groups = {};

  operations.forEach((operation, index) => {
    const type = operation.operation.split('.')[0]; // e.g., 'pairing-code' from 'pairing-code.generate'
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push({ ...operation, originalIndex: index });
  });

  return groups;
}

/**
 * Execute a group of operations with concurrency control
 */
async function executeOperationGroup(operations, maxConcurrency, timeout, req) {
  const results = [];
  const chunks = chunkArray(operations, maxConcurrency);

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(operation =>
      executeSingleOperation(operation, req)
        .then(result => ({ ...result, originalIndex: operation.originalIndex }))
        .catch(error => ({
          success: false,
          operation: operation.operation,
          error: error.message,
          originalIndex: operation.originalIndex,
        })),
    );

    const chunkResults = await Promise.allSettled(chunkPromises);
    results.push(...chunkResults.map(promise => promise.value || promise.reason));
  }

  return results;
}

/**
 * Execute a single operation
 */
async function executeSingleOperation(operation, req) {
  const { operation: opType, ...params } = operation;

  try {
    switch (opType) {
    case 'pairing-code.generate':
      return await executePairingCodeGeneration(params, req);

    case 'device.register':
      return await executeDeviceRegistration(params, req);

    case 'nft.generate':
      return await executeNFTGeneration(params, req);

    case 'thoughts.sync':
      return await executeThoughtsSync(params, req);

    case 'trust.establish':
      return await executeTrustEstablishment(params, req);

    default:
      throw new Error(`Unsupported operation: ${opType}`);
    }
  } catch (error) {
    logger.error(`Operation ${opType} failed:`, error);
    throw error;
  }
}

/**
 * Execute pairing code generation
 */
async function executePairingCodeGeneration(params, req) {
  // Simulate pairing code generation
  const { deviceId, format = 'uuid', expiresIn = 300 } = params;

  if (!deviceId) {
    throw new Error('Missing deviceId for pairing code generation');
  }

  // In real implementation, call the actual service
  const pairingCode = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    success: true,
    operation: 'pairing-code.generate',
    data: {
      pairingCode,
      format,
      expiresIn,
      deviceId,
    },
  };
}

/**
 * Execute device registration
 */
async function executeDeviceRegistration(params, req) {
  // Simulate device registration
  const { deviceId, deviceInfo } = params;

  if (!deviceId) {
    throw new Error('Missing deviceId for device registration');
  }

  return {
    success: true,
    operation: 'device.register',
    data: {
      deviceId,
      registered: true,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Execute NFT generation
 */
async function executeNFTGeneration(params, req) {
  // Simulate NFT generation
  const { style, deviceId, options = {} } = params;

  if (!style || !deviceId) {
    throw new Error('Missing style or deviceId for NFT generation');
  }

  return {
    success: true,
    operation: 'nft.generate',
    data: {
      nftId: `batch_nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      style,
      deviceId,
      status: 'queued',
    },
  };
}

/**
 * Execute thoughts sync
 */
async function executeThoughtsSync(params, req) {
  // Simulate thoughts sync
  const { thoughts } = params;

  if (!thoughts || !Array.isArray(thoughts)) {
    throw new Error('Missing or invalid thoughts array for sync');
  }

  return {
    success: true,
    operation: 'thoughts.sync',
    data: {
      syncedCount: thoughts.length,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Execute trust establishment
 */
async function executeTrustEstablishment(params, req) {
  // Simulate trust establishment
  const { trustData } = params;

  if (!trustData) {
    throw new Error('Missing trustData for trust establishment');
  }

  return {
    success: true,
    operation: 'trust.establish',
    data: {
      trustId: `batch_trust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      established: true,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Validate a single operation
 */
function validateSingleOperation(operation, index) {
  const errors = [];
  const warnings = [];

  if (!operation.operation) {
    errors.push('Missing operation type');
  }

  if (!operation.deviceId && operation.operation !== 'thoughts.sync') {
    errors.push('Missing deviceId');
  }

  // Add more validation rules as needed

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate batch operation summary
 */
function generateBatchSummary(results, executionTime) {
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;

  return {
    successCount,
    failureCount,
    successRate: Math.round((successCount / results.length) * 100),
    executionTime: `${executionTime}ms`,
    averageTimePerOperation: results.length > 0 ? Math.round(executionTime / results.length) : 0,
  };
}

/**
 * Get batch status (mock implementation)
 */
async function getBatchStatus(batchId) {
  // In real implementation, query database for batch status
  // For now, return mock data
  return {
    status: 'completed',
    progress: 100,
    startedAt: new Date(Date.now() - 5000).toISOString(),
    completedAt: new Date().toISOString(),
    totalOperations: 10,
    completedOperations: 10,
    failedOperations: 0,
  };
}

/**
 * Split array into chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId() {
  return `batch_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;
