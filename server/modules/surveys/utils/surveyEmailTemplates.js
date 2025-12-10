/**
 * Survey Email Templates
 * 
 * Professional email templates for survey notifications
 */

/**
 * Survey Assignment Email Template
 */
export const surveyAssignmentTemplate = (survey, recipient) => {
    const dueDate = survey.settings.endDate
        ? new Date(survey.settings.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'as soon as possible';

    const mandatory = survey.settings.isMandatory ? ' (Mandatory)' : '';

    return {
        subject: `New Survey Assignment${mandatory}: ${survey.title}`,
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
                    .mandatory { color: #f44336; font-weight: bold; }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 New Survey Assignment</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${recipient.profile?.firstName || recipient.username},</p>
                        
                        <p>You have been assigned a new survey${mandatory}:</p>
                        
                        <h2>${survey.title}</h2>
                        
                        ${survey.description ? `<p>${survey.description}</p>` : ''}
                        
                        <p><strong>Survey Type:</strong> ${formatSurveyType(survey.surveyType)}</p>
                        <p><strong>Number of Questions:</strong> ${survey.questions.length}</p>
                        <p><strong>Due Date:</strong> ${dueDate}</p>
                        
                        ${survey.settings.isMandatory ?
                '<p class="mandatory">⚠️ This is a mandatory survey. Please complete it before the due date.</p>' :
                '<p>Your participation is greatly appreciated.</p>'
            }
                        
                        ${survey.settings.allowAnonymous ?
                '<p>✅ Anonymous responses are allowed for this survey.</p>' :
                ''
            }
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${survey._id}" class="button">
                                Take Survey Now
                            </a>
                        </p>
                        
                        <p>Best regards,<br>HR Department</p>
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
New Survey Assignment${mandatory}

Dear ${recipient.profile?.firstName || recipient.username},

You have been assigned a new survey: ${survey.title}

${survey.description || ''}

Survey Type: ${formatSurveyType(survey.surveyType)}
Number of Questions: ${survey.questions.length}
Due Date: ${dueDate}

${survey.settings.isMandatory ? 'This is a mandatory survey. Please complete it before the due date.' : 'Your participation is greatly appreciated.'}

To take the survey, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${survey._id}

Best regards,
HR Department
        `
    };
};

/**
 * Survey Reminder Email Template
 */
export const surveyReminderTemplate = (survey, recipient) => {
    const dueDate = survey.settings.endDate
        ? new Date(survey.settings.endDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : 'soon';

    const daysRemaining = survey.settings.endDate
        ? Math.ceil((new Date(survey.settings.endDate) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

    return {
        subject: `Reminder: Complete Survey - ${survey.title}`,
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
                    .urgent { color: #f44336; font-weight: bold; }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>⏰ Survey Reminder</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${recipient.profile?.firstName || recipient.username},</p>
                        
                        <p>This is a friendly reminder to complete the following survey:</p>
                        
                        <h2>${survey.title}</h2>
                        
                        <p><strong>Due Date:</strong> ${dueDate}</p>
                        
                        ${daysRemaining !== null && daysRemaining <= 3 ?
                `<p class="urgent">⚠️ Only ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining!</p>` :
                daysRemaining !== null ?
                    `<p>${daysRemaining} days remaining to complete this survey.</p>` :
                    '<p>Please complete this survey at your earliest convenience.</p>'
            }
                        
                        ${survey.settings.isMandatory ?
                '<p class="urgent">This is a mandatory survey. Your response is required.</p>' :
                '<p>Your feedback is valuable and appreciated.</p>'
            }
                        
                        <p style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${survey._id}" class="button">
                                Complete Survey
                            </a>
                        </p>
                        
                        <p>Thank you for your cooperation.</p>
                        
                        <p>Best regards,<br>HR Department</p>
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
Survey Reminder

Dear ${recipient.profile?.firstName || recipient.username},

This is a reminder to complete the survey: ${survey.title}

Due Date: ${dueDate}
${daysRemaining !== null ? `Days Remaining: ${daysRemaining}` : ''}

${survey.settings.isMandatory ? 'This is a mandatory survey. Your response is required.' : 'Your feedback is valuable and appreciated.'}

To complete the survey, please visit: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/surveys/${survey._id}

Thank you for your cooperation.

Best regards,
HR Department
        `
    };
};

/**
 * Survey Closed Email Template
 */
export const surveyClosedTemplate = (survey, recipient, hasResponded) => {
    return {
        subject: `Survey Closed: ${survey.title}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
                    .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
                    .success { color: #4CAF50; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📊 Survey Closed</h1>
                    </div>
                    <div class="content">
                        <p>Dear ${recipient.profile?.firstName || recipient.username},</p>
                        
                        <p>The following survey has been closed:</p>
                        
                        <h2>${survey.title}</h2>
                        
                        ${hasResponded ?
                '<p class="success">✅ Thank you for completing this survey. Your feedback has been recorded.</p>' :
                '<p>This survey has ended. No further responses can be submitted.</p>'
            }
                        
                        <p>Best regards,<br>HR Department</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the HR Management System.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
Survey Closed

Dear ${recipient.profile?.firstName || recipient.username},

The survey "${survey.title}" has been closed.

${hasResponded ? 'Thank you for completing this survey. Your feedback has been recorded.' : 'This survey has ended. No further responses can be submitted.'}

Best regards,
HR Department
        `
    };
};

/**
 * Format survey type for display
 */
function formatSurveyType(type) {
    const typeMap = {
        'satisfaction': 'Employee Satisfaction',
        'training': 'Training & Development',
        'performance': 'Performance Assessment',
        'policy': 'Policy Feedback',
        '360-feedback': '360-Degree Feedback',
        'exit-interview': 'Exit Interview',
        'custom': 'Custom Survey'
    };

    return typeMap[type] || type;
}

export default {
    surveyAssignmentTemplate,
    surveyReminderTemplate,
    surveyClosedTemplate
};
