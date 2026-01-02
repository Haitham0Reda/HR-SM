# Automatic Email Generation for Users

This document explains how the automatic email generation feature works for creating new users in the HR management system.

## Overview

The system now automatically generates unique email addresses for users based on their username and the company's email domain. This eliminates the need to manually specify email addresses when creating users, while ensuring uniqueness within each company.

## Features

- **Automatic Email Generation**: Creates emails using the pattern `username@company-domain.com`
- **Uniqueness Handling**: Automatically adds numbers (1, 2, 3...) to handle duplicate usernames
- **Company Domain Support**: Each company can have its own email domain
- **Bulk Operations**: Supports bulk user creation with automatic email generation
- **Validation**: Validates email domain formats and prevents conflicts

## How It Works

### 1. Company Email Domain Setup

Each company must have an `emailDomain` configured in their company profile:

```javascript
// Example company configuration
{
  "name": "TechCorp Solutions",
  "slug": "techcorp",
  "emailDomain": "techcorp.com",
  "adminEmail": "admin@techcorp.com"
}
```

### 2. User Creation Process

When creating a new user:

1. **Username Required**: The user must have a username
2. **Email Optional**: If no email is provided, one is automatically generated
3. **Domain Lookup**: System retrieves the company's email domain
4. **Email Generation**: Creates email using `username@domain` pattern
5. **Uniqueness Check**: If email exists, adds a number (e.g., `john.doe1@company.com`)
6. **User Creation**: Creates the user with the generated email

### 3. Email Generation Examples

| Username | Existing Emails | Generated Email |
|----------|----------------|-----------------|
| `john.doe` | None | `john.doe@company.com` |
| `john.doe` | `john.doe@company.com` | `john.doe1@company.com` |
| `jane.smith` | `jane.smith@company.com`, `jane.smith1@company.com` | `jane.smith2@company.com` |
| `user@name!` | None | `username@company.com` (special chars removed) |

## API Usage

### Single User Creation

```javascript
POST /api/users
{
  "username": "john.doe",
  "password": "SecurePassword123",
  "role": "employee",
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe"
  }
  // email will be auto-generated as john.doe@company.com
}
```

Response:
```javascript
{
  "success": true,
  "data": {
    "username": "john.doe",
    "email": "john.doe@company.com",
    "role": "employee",
    // ... other user fields
  },
  "message": "Email auto-generated: john.doe@company.com"
}
```

### Bulk User Creation

```javascript
POST /api/users/bulk-create
// Upload Excel file with columns: username, firstName, lastName, etc.
// Email column is optional - will be auto-generated if missing
```

Excel file example:
| username | firstName | lastName | role | email |
|----------|-----------|----------|------|-------|
| john.doe | John | Doe | employee | |
| jane.smith | Jane | Smith | manager | jane.smith@company.com |
| mike.johnson | Mike | Johnson | employee | |

Response:
```javascript
{
  "success": true,
  "message": "Processed 3 rows: 3 created, 0 failed",
  "created": 3,
  "failed": 0,
  "results": [
    {
      "row": 2,
      "username": "john.doe",
      "email": "john.doe@company.com",
      "emailGenerated": true,
      "success": true
    },
    {
      "row": 3,
      "username": "jane.smith",
      "email": "jane.smith@company.com",
      "emailGenerated": false,
      "success": true
    },
    {
      "row": 4,
      "username": "mike.johnson",
      "email": "mike.johnson@company.com",
      "emailGenerated": true,
      "success": true
    }
  ]
}
```

## Company Domain Management

### Get Company Email Domain

```javascript
GET /api/companies/{tenantId}/email-domain

Response:
{
  "success": true,
  "data": {
    "emailDomain": "company.com"
  }
}
```

### Update Company Email Domain

```javascript
PUT /api/companies/{tenantId}/email-domain
{
  "emailDomain": "newdomain.com"
}

Response:
{
  "success": true,
  "data": {
    // updated company object
  },
  "message": "Email domain updated to newdomain.com"
}
```

## Email Generation Rules

### Username Sanitization

- Converts to lowercase
- Removes invalid characters (keeps only letters, numbers, dots, underscores, hyphens)
- Removes leading/trailing special characters
- Limits to 64 characters (email local part limit)

### Uniqueness Algorithm

1. Generate base email: `username@domain`
2. Check if email exists in the tenant
3. If exists, try `username1@domain`, `username2@domain`, etc.
4. Stop at first available email (max 999 attempts)

### Domain Validation

Email domains must match the pattern:
- Start and end with alphanumeric characters
- Can contain hyphens (not at start/end)
- Can have multiple levels (e.g., `mail.company.com`)
- Must be valid DNS format

## Error Handling

### Common Errors

1. **Missing Company Domain**
   ```javascript
   {
     "success": false,
     "message": "Company email domain not configured. Please contact administrator."
   }
   ```

2. **Invalid Domain Format**
   ```javascript
   {
     "success": false,
     "message": "Invalid email domain format"
   }
   ```

3. **Email Generation Failed**
   ```javascript
   {
     "success": false,
     "message": "Failed to generate email: Unable to generate unique email after 999 attempts"
   }
   ```

4. **Missing Username**
   ```javascript
   {
     "success": false,
     "message": "Username is required for email generation"
   }
   ```

## Configuration

### Environment Variables

No additional environment variables are required. The feature uses existing database connections and company configurations.

### Database Changes

The Company model now includes an `emailDomain` field:

```javascript
emailDomain: {
  type: String,
  required: [true, 'Email domain is required'],
  lowercase: true,
  trim: true,
  match: [/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/, 'Please provide a valid domain name']
}
```

## Testing

Run the test script to verify email generation functionality:

```bash
node test-email-generation.js
```

This will test:
- Domain validation
- Unique email generation
- Handling of existing emails
- Special character sanitization
- Bulk email generation

## Migration Guide

### For Existing Companies

1. **Add Email Domain**: Update each company record to include an `emailDomain`
2. **Test Generation**: Create a test user to verify email generation works
3. **Update Processes**: Modify user creation workflows to leverage automatic email generation

### For New Companies

1. **Required Field**: Ensure `emailDomain` is provided when creating companies
2. **Domain Validation**: The system will validate the domain format automatically
3. **User Creation**: Users can be created with just a username - email will be auto-generated

## Best Practices

1. **Choose Clear Domains**: Use company-specific domains that are easy to identify
2. **Consistent Usernames**: Use consistent username formats (e.g., firstname.lastname)
3. **Monitor Duplicates**: Review generated emails to ensure they meet company standards
4. **Backup Strategy**: Keep records of generated emails for audit purposes
5. **Domain Changes**: Plan carefully when changing company email domains as it affects new users

## Troubleshooting

### Common Issues

1. **Domain Not Set**: Ensure company has `emailDomain` configured
2. **Invalid Characters**: Username contains characters that can't be used in emails
3. **Too Many Duplicates**: Consider using different username patterns
4. **Permission Errors**: Ensure user has admin rights to create users

### Debug Steps

1. Check company configuration: `GET /api/companies/{tenantId}`
2. Verify domain format using validation function
3. Test email generation with simple usernames first
4. Check database for existing email conflicts
5. Review server logs for detailed error messages