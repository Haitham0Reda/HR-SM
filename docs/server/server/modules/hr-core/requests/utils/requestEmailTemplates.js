/**
 * Request Email Templates
 * 
 * Professional email templates for request notifications
 */

/**
 * New Request Notification Template (to manager)
 */
export const newRequestNotificationTemplate = (request, employee) => {
    const requestType = formatRequestType(request.type);
    const requestDetails = getRequestDetails(request);
    
    return {
        subject: `New ${requestType} Request from ${employee.profile?.firstName || employee.username}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .button { 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #2196F3; 
                        color: white !important; 
                        text-decoration: none; 
                        border-radius: 4px; 
                        margin: 20px 0;
                    }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📝 New Request Notification</h1>
                    </div>
                    <div class="content">
                        <p>Dear Manager,</p>
                        
                        <p>${employee.profile?.firstName || employee.username} has submitted a new ${requestType} request:</p>
                        
                        <h2>${requestType} Request Details</h2>
                        
                        ${requestDetails}
                        
                        <p><strong>Submitted:</strong> ${new Date(request.requestedAt).toLocaleDateString()}</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}" class="button">
                                Review Request
                            </a>
                        </p>
                        
                        <p>Best regards,<br>HR Management System</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the HR Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
New ${requestType} Request from ${employee.profile?.firstName || employee.username}

${employee.profile?.firstName || employee.username} has submitted a new ${requestType} request.

Request Details:
${getTextRequestDetails(request)}

Submitted: ${new Date(request.requestedAt).toLocaleDateString()}

To review this request, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}

Best regards,
HR Management System
        `
    };
};

/**
 * Sick Leave Request Notification Template (to doctor)
 */
export const sickLeaveRequestToDoctorTemplate = (request, employee) => {
    return {
        subject: `Sick Leave Request for Review - ${employee.profile?.firstName || employee.username}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .button { 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #f44336; 
                        color: white !important; 
                        text-decoration: none; 
                        border-radius: 4px; 
                        margin: 20px 0;
                    }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🏥 Sick Leave Request</h1>
                    </div>
                    <div class="content">
                        <p>Dear Doctor,</p>
                        
                        <p>${employee.profile?.firstName || employee.username} has submitted a sick leave request that requires your medical review:</p>
                        
                        <h2>Sick Leave Details</h2>
                        
                        <p><strong>Employee:</strong> ${employee.profile?.firstName || employee.username} ${employee.profile?.lastName || ''}</p>
                        <p><strong>Start Date:</strong> ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>End Date:</strong> ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Duration:</strong> ${request.details.duration || 'N/A'} days</p>
                        <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
                        
                        ${request.details.medicalDocumentation?.required ? 
                            '<p><strong>⚠️ Medical Documentation Required</strong></p>' : ''}
                        
                        <p><strong>Submitted:</strong> ${new Date(request.requestedAt).toLocaleDateString()}</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}" class="button">
                                Review Sick Leave Request
                            </a>
                        </p>
                        
                        <p>Best regards,<br>HR Management System</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the HR Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Sick Leave Request for Review - ${employee.profile?.firstName || employee.username}

${employee.profile?.firstName || employee.username} has submitted a sick leave request that requires your medical review.

Sick Leave Details:
Employee: ${employee.profile?.firstName || employee.username} ${employee.profile?.lastName || ''}
Start Date: ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}
End Date: ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}
Duration: ${request.details.duration || 'N/A'} days
Reason: ${request.details.reason || 'N/A'}

${request.details.medicalDocumentation?.required ? '⚠️ Medical Documentation Required' : ''}

Submitted: ${new Date(request.requestedAt).toLocaleDateString()}

To review this request, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}

Best regards,
HR Management System
        `
    };
};

/**
 * Request Approval Notification Template (to employee)
 */
export const requestApprovalNotificationTemplate = (request, employee) => {
    const requestType = formatRequestType(request.type);
    const action = request.status === 'approved' ? 'approved' : 'rejected';
    const actionColor = request.status === 'approved' ? '#4CAF50' : '#f44336';
    
    return {
        subject: `${requestType} Request ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: ${actionColor}; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${request.status === 'approved' ? '✅' : '❌'} Request ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${employee.profile?.firstName || employee.username},</p>
                        
                        <p>Your ${requestType} request has been ${action}:</p>
                        
                        <h2>Request Details</h2>
                        
                        <p><strong>Type:</strong> ${requestType}</p>
                        <p><strong>Status:</strong> ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</p>
                        ${request.reviewedAt ? `<p><strong>Reviewed:</strong> ${new Date(request.reviewedAt).toLocaleDateString()}</p>` : ''}
                        ${request.comments ? `<p><strong>Comments:</strong> ${request.comments}</p>` : ''}
                        
                        <p>Best regards,<br>HR Management System</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the HR Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
${requestType} Request ${action.charAt(0).toUpperCase() + action.slice(1)}

Dear ${employee.profile?.firstName || employee.username},

Your ${requestType} request has been ${action}.

Request Details:
Type: ${requestType}
Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
${request.reviewedAt ? `Reviewed: ${new Date(request.reviewedAt).toLocaleDateString()}` : ''}
${request.comments ? `Comments: ${request.comments}` : ''}

Best regards,
HR Management System
        `
    };
};

/**
 * Reminder Notification Template (for pending requests)
 */
export const reminderNotificationTemplate = (request, recipient, recipientType) => {
    const requestType = formatRequestType(request.type);
    const daysPending = Math.ceil((new Date() - new Date(request.requestedAt)) / (1000 * 60 * 60 * 24));
    
    return {
        subject: `Reminder: Pending ${requestType} Request`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .button { 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #FF9800; 
                        color: white !important; 
                        text-decoration: none; 
                        border-radius: 4px; 
                        margin: 20px 0;
                    }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Pending Request Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${recipientType},</p>
                        
                        <p>This is a reminder about a pending ${requestType} request that requires your attention:</p>
                        
                        <h2>Request Details</h2>
                        
                        <p><strong>Type:</strong> ${requestType}</p>
                        <p><strong>Submitted:</strong> ${new Date(request.requestedAt).toLocaleDateString()} (${daysPending} days ago)</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}" class="button">
                                Review Request
                            </a>
                        </p>
                        
                        <p>Please review and process this request at your earliest convenience.</p>
                        
                        <p>Best regards,<br>HR Management System</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated reminder from the HR Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Pending Request Reminder

Dear ${recipientType},

This is a reminder about a pending ${requestType} request that requires your attention.

Request Details:
Type: ${requestType}
Submitted: ${new Date(request.requestedAt).toLocaleDateString()} (${daysPending} days ago)

To review this request, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}

Please review and process this request at your earliest convenience.

Best regards,
HR Management System
        `
    };
};

/**
 * Sick Leave Approval Notification Template (to manager and HR)
 */
export const sickLeaveApprovalNotificationTemplate = (request, employee, doctor) => {
    return {
        subject: `Sick Leave Request Approved by Doctor - ${employee.profile?.firstName || employee.username}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .button { 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #4CAF50; 
                        color: white !important; 
                        text-decoration: none; 
                        border-radius: 4px; 
                        margin: 20px 0;
                    }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Sick Leave Approved by Doctor</h1>
                    </div>
                    <div class="content">
                        <p>Dear Manager/HR,</p>
                        
                        <p>The sick leave request for ${employee.profile?.firstName || employee.username} has been approved by the doctor:</p>
                        
                        <h2>Sick Leave Details</h2>
                        
                        <p><strong>Employee:</strong> ${employee.profile?.firstName || employee.username} ${employee.profile?.lastName || ''}</p>
                        <p><strong>Doctor:</strong> ${doctor?.profile?.firstName || doctor?.username || 'N/A'}</p>
                        <p><strong>Start Date:</strong> ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>End Date:</strong> ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Duration:</strong> ${request.details.duration || 'N/A'} days</p>
                        <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
                        
                        <p><strong>Doctor's Approval:</strong> ${new Date().toLocaleDateString()}</p>
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}" class="button">
                                View Request Details
                            </a>
                        </p>
                        
                        <p>Please take the necessary actions to process this approved sick leave.</p>
                        
                        <p>Best regards,<br>HR Management System</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the HR Management System.</p>
                        <p>Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Sick Leave Request Approved by Doctor - ${employee.profile?.firstName || employee.username}

Dear Manager/HR,

The sick leave request for ${employee.profile?.firstName || employee.username} has been approved by the doctor.

Sick Leave Details:
Employee: ${employee.profile?.firstName || employee.username} ${employee.profile?.lastName || ''}
Doctor: ${doctor?.profile?.firstName || doctor?.username || 'N/A'}
Start Date: ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}
End Date: ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}
Duration: ${request.details.duration || 'N/A'} days
Reason: ${request.details.reason || 'N/A'}

Doctor's Approval: ${new Date().toLocaleDateString()}

To view the request details, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/requests/${request._id}

Please take the necessary actions to process this approved sick leave.

Best regards,
HR Management System
        `
    };
};

/**
 * Format request type for display
 */
function formatRequestType(type) {
    const typeMap = {
        'permission': 'Permission',
        'overtime': 'Overtime',
        'sick-leave': 'Sick Leave',
        'mission': 'Mission',
        'day-swap': 'Day Swap'
    };
    
    return typeMap[type] || type;
}

/**
 * Get request details for HTML display
 */
function getRequestDetails(request) {
    let details = '';
    
    switch (request.type) {
        case 'permission':
            details = `
                <p><strong>Date:</strong> ${request.details.date ? new Date(request.details.date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Start Time:</strong> ${request.details.startTime || 'N/A'}</p>
                <p><strong>End Time:</strong> ${request.details.endTime || 'N/A'}</p>
                <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
            `;
            break;
            
        case 'overtime':
            details = `
                <p><strong>Date:</strong> ${request.details.date ? new Date(request.details.date).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Start Time:</strong> ${request.details.startTime || 'N/A'}</p>
                <p><strong>End Time:</strong> ${request.details.endTime || 'N/A'}</p>
                <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
            `;
            break;
            
        case 'sick-leave':
            details = `
                <p><strong>Start Date:</strong> ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>End Date:</strong> ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Duration:</strong> ${request.details.duration || 'N/A'} days</p>
                <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
            `;
            break;
            
        case 'mission':
            details = `
                <p><strong>Start Date:</strong> ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>End Date:</strong> ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Destination:</strong> ${request.details.destination || 'N/A'}</p>
                <p><strong>Purpose:</strong> ${request.details.purpose || 'N/A'}</p>
            `;
            break;
            
        case 'day-swap':
            details = `
                <p><strong>Original Date:</strong> ${request.details.originalDate ? new Date(request.details.originalDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>New Date:</strong> ${request.details.newDate ? new Date(request.details.newDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Reason:</strong> ${request.details.reason || 'N/A'}</p>
            `;
            break;
            
        default:
            details = '<p>Request details not available.</p>';
    }
    
    return details;
}

/**
 * Get request details for text display
 */
function getTextRequestDetails(request) {
    let details = '';
    
    switch (request.type) {
        case 'permission':
            details = `
Date: ${request.details.date ? new Date(request.details.date).toLocaleDateString() : 'N/A'}
Start Time: ${request.details.startTime || 'N/A'}
End Time: ${request.details.endTime || 'N/A'}
Reason: ${request.details.reason || 'N/A'}
            `;
            break;
            
        case 'overtime':
            details = `
Date: ${request.details.date ? new Date(request.details.date).toLocaleDateString() : 'N/A'}
Start Time: ${request.details.startTime || 'N/A'}
End Time: ${request.details.endTime || 'N/A'}
Reason: ${request.details.reason || 'N/A'}
            `;
            break;
            
        case 'sick-leave':
            details = `
Start Date: ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}
End Date: ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}
Duration: ${request.details.duration || 'N/A'} days
Reason: ${request.details.reason || 'N/A'}
            `;
            break;
            
        case 'mission':
            details = `
Start Date: ${request.details.startDate ? new Date(request.details.startDate).toLocaleDateString() : 'N/A'}
End Date: ${request.details.endDate ? new Date(request.details.endDate).toLocaleDateString() : 'N/A'}
Destination: ${request.details.destination || 'N/A'}
Purpose: ${request.details.purpose || 'N/A'}
            `;
            break;
            
        case 'day-swap':
            details = `
Original Date: ${request.details.originalDate ? new Date(request.details.originalDate).toLocaleDateString() : 'N/A'}
New Date: ${request.details.newDate ? new Date(request.details.newDate).toLocaleDateString() : 'N/A'}
Reason: ${request.details.reason || 'N/A'}
            `;
            break;
            
        default:
            details = 'Request details not available.';
    }
    
    return details;
}

export default {
    newRequestNotificationTemplate,
    sickLeaveRequestToDoctorTemplate,
    requestApprovalNotificationTemplate,
    reminderNotificationTemplate,
    sickLeaveApprovalNotificationTemplate
};