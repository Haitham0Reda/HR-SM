/**
 * ID Card Batch Middleware
 * 
 * Business logic for ID card batch operations
 * Extracted from idCardBatch.model.js to follow middleware organization pattern
 */

/**
 * Generate batch number if not provided
 */
export const generateBatchNumber = (req, res, next) => {
    if (!req.body.batchNumber && !req.batch) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        req.body.batchNumber = `BATCH-${timestamp}-${random}`;
    }
    next();
};

/**
 * Update batch progress percentage
 */
export const updateBatchProgress = (req, res, next) => {
    if (req.batch && req.batch.processing.totalCards > 0) {
        req.batch.processing.progress = Math.round(
            (req.batch.processing.processedCards / req.batch.processing.totalCards) * 100
        );
    } else if (req.body.processing?.totalCards > 0) {
        req.body.processing.progress = Math.round(
            (req.body.processing.processedCards / req.body.processing.totalCards) * 100
        );
    }
    next();
};

export default {
    generateBatchNumber,
    updateBatchProgress
};
