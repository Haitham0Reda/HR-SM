# Salary Encryption Setup Guide

## Overview
The salary management system uses AES-256-GCM encryption to secure sensitive salary data in the database. This ensures that salary information is encrypted at rest and only accessible to authorized users.

## Environment Setup

### 1. Generate Encryption Key
Run this command to generate a secure encryption key:

```bash
node -e "console.log('SALARY_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Environment Variables
Add the generated key to your `.env` file:

```env
# Salary encryption key (64 hex characters = 32 bytes)
SALARY_ENCRYPTION_KEY=your_64_character_hex_key_here
```

### 3. Production Security
- **NEVER** commit the encryption key to version control
- Store the key securely (e.g., AWS Secrets Manager, Azure Key Vault)
- Use different keys for different environments
- Regularly rotate encryption keys (requires data migration)

## Role-Based Access Control

### Authorized Roles for Salary Data:
- **HR**: Full access (view and manage salary data)
- **Finance Manager**: Full access (view and manage salary data)
- **Finance**: Read-only access (view salary data)
- **Admin**: Debug access only (sees masked values like ***)

### Security Features:
1. **Encryption at Rest**: All salary values are encrypted in the database
2. **Role-Based Decryption**: Only authorized users can decrypt salary data
3. **Masked Display**: Unauthorized users see masked values (***)
4. **Audit Trail**: All salary operations are logged
5. **Secure Transport**: Data is encrypted in transit via HTTPS

## Database Schema
The salary model stores encrypted fields:
- `baseSalaryEncrypted`: Encrypted base salary
- `allowancesEncrypted`: Encrypted allowance amounts
- `grossSalaryEncrypted`: Encrypted total salary

Virtual properties provide decrypted access for authorized users:
- `baseSalary`: Decrypted base salary (virtual)
- `allowances`: Decrypted allowances (virtual)
- `grossSalary`: Decrypted gross salary (virtual)

## Development Mode
For development, a default key is used if `SALARY_ENCRYPTION_KEY` is not set. This is NOT secure and should never be used in production.

## Key Rotation
To rotate encryption keys:
1. Generate a new key
2. Update the environment variable
3. Run a migration script to re-encrypt existing data
4. Verify all data is accessible with the new key

## Troubleshooting
- If salary data appears as "***", check user permissions
- If decryption fails, verify the encryption key is correct
- Check server logs for encryption/decryption errors