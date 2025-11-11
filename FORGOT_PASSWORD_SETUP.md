# Forgot Password Feature Setup Guide

## Overview

This guide explains how to set up and use the forgot password feature in the HR-SM application.

## Features Implemented

### Backend

1. **Forgot Password Endpoint** (`POST /api/auth/forgot-password`)

   - Accepts email address
   - Generates secure reset token
   - Sends password reset email
   - Token expires in 30 minutes

2. **Reset Password Endpoint** (`POST /api/auth/reset-password/:token`)

   - Validates reset token
   - Updates user password
   - Clears reset token after successful reset

3. **Verify Token Endpoint** (`GET /api/auth/verify-reset-token/:token`)
   - Checks if reset token is valid and not expired

### Frontend

1. **New Login Page** - Modern dark theme design matching the provided image
2. **Forgot Password Page** - Email submission form
3. **Reset Password Page** - New password form with token validation

## Email Configuration

### For Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:

   - Go to Google Account Settings
   - Security → 2-Step Verification
   - App passwords → Select app: Mail, Select device: Other
   - Copy the generated 16-character password

3. **Update .env file**:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
CLIENT_URL=http://localhost:3000
```

### For Other Email Providers

#### Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

#### Yahoo

```env
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

#### Custom SMTP Server

```env
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-password
```

## Testing the Feature

### 1. Test Forgot Password Flow

1. Navigate to `http://localhost:3000/login`
2. Click "Forgot Password?" button
3. Enter your email address
4. Check your email for the reset link
5. Click the reset link (valid for 30 minutes)
6. Enter and confirm your new password
7. Login with your new password

### 2. Test with Postman/cURL

**Forgot Password:**

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Reset Password:**

```bash
curl -X POST http://localhost:5000/api/auth/reset-password/YOUR_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{"password":"newpassword123"}'
```

**Verify Token:**

```bash
curl http://localhost:5000/api/auth/verify-reset-token/YOUR_TOKEN_HERE
```

## Security Features

1. **Token Hashing**: Reset tokens are hashed before storage using SHA-256
2. **Token Expiration**: Tokens expire after 30 minutes
3. **One-Time Use**: Tokens are cleared after successful password reset
4. **No User Enumeration**: Same response whether email exists or not
5. **Password Validation**: Minimum 6 characters required

## Database Schema Updates

The User model now includes:

```javascript
{
  resetPasswordToken: String,      // Hashed reset token
  resetPasswordExpire: Date         // Token expiration timestamp
}
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials** in .env file
2. **Verify firewall** isn't blocking port 587
3. **Check spam folder** for reset emails
4. **Enable "Less secure app access"** for Gmail (if not using app password)
5. **Check server logs** for detailed error messages

### Token Invalid/Expired

1. Tokens expire after 30 minutes
2. Request a new reset link
3. Check system time is synchronized

### Password Not Updating

1. Ensure password meets minimum requirements (6 characters)
2. Check MongoDB connection
3. Verify token hasn't been used already

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
EMAIL_HOST=your-production-smtp-host
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your-secure-password
CLIENT_URL=https://yourdomain.com
JWT_SECRET=your-very-secure-secret
```

### Email Service Recommendations

For production, consider using:

- **SendGrid** - Free tier: 100 emails/day
- **Mailgun** - Free tier: 5,000 emails/month
- **Amazon SES** - Very affordable, highly scalable
- **Postmark** - Excellent deliverability

### Security Checklist

- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Use environment-specific CLIENT_URL
- [ ] Implement rate limiting on forgot password endpoint
- [ ] Monitor for abuse/spam
- [ ] Use dedicated email service (not Gmail)
- [ ] Set up SPF, DKIM, and DMARC records
- [ ] Log all password reset attempts

## API Documentation

### POST /api/auth/forgot-password

**Request:**

```json
{
  "email": "user@example.com"
}
```

**Response (Success):**

```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Response (Error):**

```json
{
  "error": "Email is required"
}
```

### POST /api/auth/reset-password/:token

**Request:**

```json
{
  "password": "newpassword123"
}
```

**Response (Success):**

```json
{
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

**Response (Error):**

```json
{
  "error": "Invalid or expired reset token"
}
```

### GET /api/auth/verify-reset-token/:token

**Response (Success):**

```json
{
  "message": "Token is valid",
  "email": "user@example.com"
}
```

**Response (Error):**

```json
{
  "error": "Invalid or expired reset token"
}
```

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test email configuration with a simple test script
4. Review MongoDB connection and user model

## License

This feature is part of the HR-SM application.
