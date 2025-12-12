/**
 * Report Export Middleware
 * 
 * Business logic for report export operations
 * Extracted from reportExport.model.js to follow middleware organization pattern
 */

/**
 * Set subtitle from date range if not provided
 */
export const setReportSubtitle = (req, res, next) => {
    if (req.body.dateRange && !req.body.subtitle) {
        const start = new Date(req.body.dateRange.startDate).toLocaleDateString();
        const end = new Date(req.body.dateRange.endDate).toLocaleDateString();
        req.body.subtitle = `${req.body.dateRange.label || 'Period'}: ${start} - ${end}`;
    }

    // Set default expiration (30 days from creation)
    if (!req.body.expiresAt) {
        req.body.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    next();
};

/**
 * Generate filename if not provided
 */
export const generateReportFilename = (req, res, next) => {
    if (!req.body.exportFile?.fileName && req.body.reportType) {
        const timestamp = new Date().getTime();
        const type = req.body.reportType.replace(/-/g, '_');
        const extension = getFileExtension(req.body.exportFormat);

        if (!req.body.exportFile) {
            req.body.exportFile = {};
        }
        req.body.exportFile.fileName = `${type}_${timestamp}${extension}`;
    }
    next();
};

/**
 * Helper function to get file extension
 */
const getFileExtension = (exportFormat) => {
    const extensions = {
        'html': '.html',
        'excel': '.xlsx',
        'pdf': '.pdf'
    };
    return extensions[exportFormat] || '';
};

export default {
    setReportSubtitle,
    generateReportFilename
};
