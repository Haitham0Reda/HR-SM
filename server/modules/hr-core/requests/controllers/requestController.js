// Request Controller
import Request from '../models/Request.js';
import User from '../../models/User.js';
import logger from '../../../../utils/logger.js';
import emailIntegrationService from '../../services/emailIntegrationService.js';

export const getAllRequests = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const requests = await Request.find({ tenantId })
            .populate('requestedBy', 'username email employeeId personalInfo department')
            .populate('reviewer', 'username email')
            .populate('approvalChain.approver', 'username email')
            .sort({ createdAt: -1 });
            
        res.json({
            success: true,
            data: requests
        });
    } catch (err) {
        logger.error('Error fetching requests:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const requestData = {
            ...req.body,
            tenantId,
            requestedBy: req.user._id
        };
        
        const request = new Request(requestData);
        const savedRequest = await request.save();
        
        // Populate employee details
        await savedRequest.populate('requestedBy', 'username email employeeId personalInfo department');
        
        logger.info(`Request created: ${savedRequest._id} by user ${req.user._id}`);
        
        // Send email notification if email service is available
        if (savedRequest.requestType === 'overtime' && savedRequest.reviewer) {
            const approver = await User.findById(savedRequest.reviewer);
            if (approver) {
                await emailIntegrationService.sendOvertimeRequestNotification(
                    tenantId,
                    savedRequest.requestData,
                    savedRequest.requestedBy,
                    approver
                );
            }
        }
        
        res.status(201).json({
            success: true,
            data: savedRequest
        });
    } catch (err) {
        logger.error('Error creating request:', err);
        res.status(400).json({ error: err.message });
    }
};

export const getRequestById = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const request = await Request.findOne({ _id: req.params.id, tenantId })
            .populate('requestedBy', 'username email employeeId personalInfo department')
            .populate('reviewer', 'username email')
            .populate('approvalChain.approver', 'username email');
            
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        res.json({
            success: true,
            data: request
        });
    } catch (err) {
        logger.error('Error fetching request:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const request = await Request.findOne({ _id: req.params.id, tenantId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        // Update allowed fields
        const allowedUpdates = ['requestData', 'comments'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                request[field] = req.body[field];
            }
        });
        
        await request.save();
        await request.populate('requestedBy', 'username email employeeId personalInfo department');
        await request.populate('reviewer', 'username email');
        
        logger.info(`Request updated: ${request._id} by user ${req.user._id}`);
        
        res.json({
            success: true,
            data: request
        });
    } catch (err) {
        logger.error('Error updating request:', err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const request = await Request.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        logger.info(`Request deleted: ${req.params.id} by user ${req.user._id}`);
        
        res.json({
            success: true,
            message: 'Request deleted'
        });
    } catch (err) {
        logger.error('Error deleting request:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Approve a request
 */
export const approveRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const { comments } = req.body;
        
        const request = await Request.findOne({ _id: req.params.id, tenantId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await request.approve(req.user._id, comments);
        await request.populate('requestedBy', 'username email employeeId personalInfo department');
        await request.populate('reviewer', 'username email');
        await request.populate('approvalChain.approver', 'username email');
        
        logger.info(`Request approved: ${request._id} by user ${req.user._id}`);
        
        // Trigger business logic based on request type
        await triggerApprovalBusinessLogic(request);
        
        // Send email notification if email service is available
        if (request.requestType === 'vacation') {
            await emailIntegrationService.sendVacationApprovalNotification(
                tenantId,
                request.requestData,
                request.requestedBy,
                true,
                comments
            );
        }
        
        res.json({
            success: true,
            message: 'Request approved successfully',
            data: request
        });
    } catch (err) {
        logger.error('Error approving request:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Reject a request
 */
export const rejectRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const { comments } = req.body;
        
        const request = await Request.findOne({ _id: req.params.id, tenantId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await request.reject(req.user._id, comments);
        await request.populate('requestedBy', 'username email employeeId personalInfo department');
        await request.populate('reviewer', 'username email');
        await request.populate('approvalChain.approver', 'username email');
        
        logger.info(`Request rejected: ${request._id} by user ${req.user._id}`);
        
        // Send email notification if email service is available
        if (request.requestType === 'vacation') {
            await emailIntegrationService.sendVacationApprovalNotification(
                tenantId,
                request.requestData,
                request.requestedBy,
                false,
                comments
            );
        }
        
        res.json({
            success: true,
            message: 'Request rejected successfully',
            data: request
        });
    } catch (err) {
        logger.error('Error rejecting request:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Cancel a request
 */
export const cancelRequest = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const { comments } = req.body;
        
        const request = await Request.findOne({ _id: req.params.id, tenantId });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        
        await request.cancel(req.user._id, comments);
        await request.populate('requestedBy', 'username email employeeId personalInfo department');
        
        logger.info(`Request cancelled: ${request._id} by user ${req.user._id}`);
        
        res.json({
            success: true,
            message: 'Request cancelled successfully',
            data: request
        });
    } catch (err) {
        logger.error('Error cancelling request:', err);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Get pending requests
 */
export const getPendingRequests = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const requests = await Request.getPendingRequests(tenantId);
        
        res.json({
            success: true,
            data: requests
        });
    } catch (err) {
        logger.error('Error fetching pending requests:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get requests by type
 */
export const getRequestsByType = async (req, res) => {
    try {
        const { tenantId } = req.tenant || {};
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant context required' });
        }
        
        const { type } = req.params;
        const requests = await Request.getByType(tenantId, type);
        
        res.json({
            success: true,
            data: requests
        });
    } catch (err) {
        logger.error('Error fetching requests by type:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Trigger business logic when request is approved
 */
async function triggerApprovalBusinessLogic(request) {
    try {
        switch (request.requestType) {
            case 'vacation':
                // Update vacation balance
                logger.info(`Vacation request approved - updating balance for user ${request.requestedBy}`);
                // TODO: Implement vacation balance update
                break;
                
            case 'overtime':
                // Record overtime hours
                logger.info(`Overtime request approved - recording hours for user ${request.requestedBy}`);
                // TODO: Implement overtime recording
                break;
                
            case 'mission':
                // Update attendance records
                logger.info(`Mission request approved - updating attendance for user ${request.requestedBy}`);
                // TODO: Implement mission attendance update
                break;
                
            case 'forget-check':
                // Update attendance record
                logger.info(`Forget-check request approved - updating attendance for user ${request.requestedBy}`);
                // TODO: Implement forget-check attendance update
                break;
                
            case 'permission':
                // Update attendance record
                logger.info(`Permission request approved - updating attendance for user ${request.requestedBy}`);
                // TODO: Implement permission attendance update
                break;
                
            default:
                logger.info(`No specific business logic for request type: ${request.requestType}`);
        }
    } catch (error) {
        logger.error('Error triggering approval business logic:', error);
        // Don't throw - approval should succeed even if business logic fails
    }
}
