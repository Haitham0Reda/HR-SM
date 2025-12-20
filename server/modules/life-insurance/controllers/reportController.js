import asyncHandler from '../../../core/utils/asyncHandler.js';
import { sendSuccess, sendError } from '../../../core/utils/response.js';
import reportService from '../services/reportService.js';
import logger from '../../../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Generate insurance report in PDF format
 * @route POST /api/v1/life-insurance/reports/pdf
 * @access Private (Manager, HR, Admin)
 */
export const generatePDFReport = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        includeExpired = false,
        includeClaims = true,
        includeFamilyMembers = true,
        reportTitle = 'Insurance Report'
    } = req.body;

    try {
        const filePath = await reportService.generateInsuranceReportPDF(req.tenant.id, {
            startDate,
            endDate,
            includeExpired,
            includeClaims,
            includeFamilyMembers,
            reportTitle
        });

        const filename = path.basename(filePath);

        logger.info('PDF insurance report generated', {
            tenantId: req.tenant.id,
            filename,
            generatedBy: req.user._id,
            options: { startDate, endDate, includeExpired, includeClaims, includeFamilyMembers }
        });

        sendSuccess(res, {
            filename,
            downloadUrl: `/api/v1/life-insurance/reports/download/${filename}`,
            generatedAt: new Date()
        }, 'PDF report generated successfully');

    } catch (error) {
        logger.error('Error generating PDF report', {
            tenantId: req.tenant.id,
            error: error.message,
            stack: error.stack
        });
        
        sendError(res, 'Failed to generate PDF report', 500);
    }
});

/**
 * Generate insurance report in Excel format
 * @route POST /api/v1/life-insurance/reports/excel
 * @access Private (Manager, HR, Admin)
 */
export const generateExcelReport = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        includeExpired = false,
        includeClaims = true,
        includeFamilyMembers = true
    } = req.body;

    try {
        const filePath = await reportService.generateInsuranceReportExcel(req.tenant.id, {
            startDate,
            endDate,
            includeExpired,
            includeClaims,
            includeFamilyMembers
        });

        const filename = path.basename(filePath);

        logger.info('Excel insurance report generated', {
            tenantId: req.tenant.id,
            filename,
            generatedBy: req.user._id,
            options: { startDate, endDate, includeExpired, includeClaims, includeFamilyMembers }
        });

        sendSuccess(res, {
            filename,
            downloadUrl: `/api/v1/life-insurance/reports/download/${filename}`,
            generatedAt: new Date()
        }, 'Excel report generated successfully');

    } catch (error) {
        logger.error('Error generating Excel report', {
            tenantId: req.tenant.id,
            error: error.message,
            stack: error.stack
        });
        
        sendError(res, 'Failed to generate Excel report', 500);
    }
});

/**
 * Download generated report
 * @route GET /api/v1/life-insurance/reports/download/:filename
 * @access Private
 */
export const downloadReport = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return sendError(res, 'Invalid filename', 400);
    }

    // Check if filename belongs to current tenant (basic security)
    if (!filename.includes(req.tenant.id)) {
        return sendError(res, 'Report not found', 404);
    }

    const filePath = path.join(reportService.reportsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return sendError(res, 'Report file not found', 404);
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate headers
    let contentType = 'application/octet-stream';
    if (fileExtension === '.pdf') {
        contentType = 'application/pdf';
    } else if (fileExtension === '.xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('Insurance report downloaded', {
        tenantId: req.tenant.id,
        filename,
        downloadedBy: req.user._id
    });
});

/**
 * Get available reports for tenant
 * @route GET /api/v1/life-insurance/reports
 * @access Private (Manager, HR, Admin)
 */
export const getAvailableReports = asyncHandler(async (req, res) => {
    try {
        const files = fs.readdirSync(reportService.reportsDir);
        
        // Filter files for current tenant
        const tenantFiles = files.filter(file => file.includes(req.tenant.id));
        
        const reports = tenantFiles.map(filename => {
            const filePath = path.join(reportService.reportsDir, filename);
            const stats = fs.statSync(filePath);
            const fileExtension = path.extname(filename).toLowerCase();
            
            return {
                filename,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                type: fileExtension === '.pdf' ? 'PDF' : fileExtension === '.xlsx' ? 'Excel' : 'Unknown',
                downloadUrl: `/api/v1/life-insurance/reports/download/${filename}`
            };
        });

        // Sort by creation date (newest first)
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        sendSuccess(res, reports, 'Available reports retrieved successfully');

    } catch (error) {
        logger.error('Error retrieving available reports', {
            tenantId: req.tenant.id,
            error: error.message
        });
        
        sendError(res, 'Failed to retrieve available reports', 500);
    }
});

/**
 * Delete a report file
 * @route DELETE /api/v1/life-insurance/reports/:filename
 * @access Private (Manager, HR, Admin)
 */
export const deleteReport = asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return sendError(res, 'Invalid filename', 400);
    }

    // Check if filename belongs to current tenant (basic security)
    if (!filename.includes(req.tenant.id)) {
        return sendError(res, 'Report not found', 404);
    }

    const filePath = path.join(reportService.reportsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return sendError(res, 'Report file not found', 404);
    }

    try {
        // Delete the file
        fs.unlinkSync(filePath);

        logger.info('Insurance report deleted', {
            tenantId: req.tenant.id,
            filename,
            deletedBy: req.user._id
        });

        sendSuccess(res, null, 'Report deleted successfully');

    } catch (error) {
        logger.error('Error deleting report', {
            tenantId: req.tenant.id,
            filename,
            error: error.message
        });
        
        sendError(res, 'Failed to delete report', 500);
    }
});

/**
 * Clean up old reports
 * @route POST /api/v1/life-insurance/reports/cleanup
 * @access Private (Admin only)
 */
export const cleanupOldReports = asyncHandler(async (req, res) => {
    const { maxAgeHours = 24 } = req.body;

    try {
        await reportService.cleanupOldReports(maxAgeHours);

        logger.info('Old insurance reports cleaned up', {
            tenantId: req.tenant.id,
            maxAgeHours,
            cleanedBy: req.user._id
        });

        sendSuccess(res, null, `Reports older than ${maxAgeHours} hours have been cleaned up`);

    } catch (error) {
        logger.error('Error cleaning up old reports', {
            tenantId: req.tenant.id,
            error: error.message
        });
        
        sendError(res, 'Failed to cleanup old reports', 500);
    }
});

export default {
    generatePDFReport,
    generateExcelReport,
    downloadReport,
    getAvailableReports,
    deleteReport,
    cleanupOldReports
};