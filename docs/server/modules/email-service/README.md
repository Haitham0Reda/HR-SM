# Email Service Module

The Email Service module provides email functionality to other modules in the HR Management System. It supports multiple email providers and template-based email rendering.

## Features

- **Multiple Providers**: Support for SMTP, SendGrid, and AWS SES
- **Template Rendering**: Handlebars-based email templates
- **Email Logging**: Track all sent emails per tenant
- **Graceful Degradation**: Other modules work without email service
- **Provider Selection**: Choose provider per email or use default

## Architecture

```
email-service/
├── providers/           # Email provider implementations
│   ├── emailProvider.js    # Base provider interface
│   ├── smtpProvider.js     # SMTP provider
│   ├── sendgridProvider.js # SendGrid provider
│   └── sesProvider.js      # AWS SES provider
├── services/
│   └── emailService.js     # Main email service
├── models/
│   └── EmailLog.js         # Email log model
├── controllers/
│   └── emailController.js  # API controller
├── routes/
│   └── emailRoutes.js      # API routes
├── templates/              # Email templates
│   ├── overtimeRequest.hbs
│   ├── vacationApproval.hbs
│   └── taskAssignment.hbs
└── module.config.js        # Module configuration
```

## Configuration

### SMTP Provider

```javascript
{
  provider: 'smtp',
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    defaultFrom: 'noreply@yourcompany.com'
  }
}
```

### SendGrid Provider

```javascript
{
  provider: 'sendgrid',
  sendgrid: {
    apiKey: 'your-sendgrid-api-key',
    defaultFrom: 'noreply@yourcompany.com'
  }
}
```

### AWS SES Provider

```javascript
{
  provider: 'ses',
  ses: {
    region: 'us-east-1',
    accessKeyId: 'your-access-key-id',
    secretAccessKey: 'your-secret-access-key',
    defaultFrom: 'noreply@yourcompany.com'
  }
}
```

## API Endpoints

### Send Email
```
POST /api/v1/email-service/send
```

**Request Body:**
```json
{
  "to": "user@example.com",
  "subject": "Test Email",
  "template": "overtimeRequest",
  "variables": {
    "approverName": "John Doe",
    "employeeName": "Jane Smith",
    "hours": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "abc123",
    "provider": "smtp"
  }
}
```

### Get Templates
```
GET /api/v1/email-service/templates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      "overtimeRequest",
      "vacationApproval",
      "taskAssignment"
    ]
  }
}
```

### Get Email Logs
```
GET /api/v1/email-service/logs?limit=50&skip=0&status=sent
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "to": "user@example.com",
        "subject": "Test Email",
        "status": "sent",
        "sentAt": "2025-12-09T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

### Get Status
```
GET /api/v1/email-service/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "providers": ["smtp", "sendgrid"],
    "defaultProvider": "smtp"
  }
}
```

## Integration with Other Modules

### HR-Core Integration

HR-Core uses the email service with graceful degradation:

```javascript
import emailIntegrationService from './services/emailIntegrationService.js';

// Check if email service is available
const enabled = await emailIntegrationService.isEnabled(tenantId);

// Send email (works even if service is disabled)
await emailIntegrationService.sendOvertimeRequestNotification(
  tenantId,
  requestData,
  employee,
  approver
);
```

**Graceful Degradation:**
- If email service is disabled, operations continue successfully
- Email requests are logged for later processing
- No errors are thrown to calling code

### Tasks Module Integration

```javascript
// Check if email service is available
const emailService = await import('../email-service/services/emailService.js');
const enabled = await emailService.default.isEnabled(tenantId);

if (enabled) {
  await emailService.default.sendEmail(tenantId, {
    to: assignee.email,
    subject: 'New Task Assignment',
    template: 'taskAssignment',
    variables: {
      assigneeName: assignee.name,
      taskTitle: task.title,
      priority: task.priority
    }
  });
}
```

## Email Templates

Templates use Handlebars syntax and support:
- Variables: `{{variableName}}`
- Conditionals: `{{#if condition}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`

### Creating Custom Templates

1. Create a new `.hbs` file in `templates/` directory
2. Use Handlebars syntax for dynamic content
3. Template will be automatically loaded on service initialization

Example:
```handlebars
<!DOCTYPE html>
<html>
<body>
  <h1>Hello {{userName}}</h1>
  <p>{{message}}</p>
</body>
</html>
```

## Dependencies

- `nodemailer`: SMTP email sending
- `@sendgrid/mail`: SendGrid integration
- `@aws-sdk/client-ses`: AWS SES integration
- `handlebars`: Template rendering

## Module Metadata

- **Name**: email-service
- **Dependencies**: None (standalone module)
- **Provides To**: hr-core, tasks, payroll, notifications, clinic
- **Pricing Tier**: Premium ($29.99/month)

## Security Considerations

- Email credentials stored securely in environment variables
- TenantId validation on all operations
- Email logs are tenant-scoped
- Rate limiting on send endpoint (recommended)

## Troubleshooting

### Email Not Sending

1. Check provider configuration
2. Verify API keys/credentials
3. Check email logs for error messages
4. Verify email service is enabled for tenant

### Template Not Found

1. Ensure template file exists in `templates/` directory
2. Check template name matches filename (without .hbs)
3. Restart service to reload templates

### Provider Connection Failed

1. Verify network connectivity
2. Check firewall rules
3. Verify credentials are correct
4. Check provider service status
