# Bulk User Upload Feature - Complete Guide

## Overview

The bulk user upload feature allows administrators to create multiple users at once by uploading an Excel file (.xlsx or .xls) with complete user information including personal details, employment data, and vacation balances.

## How to Use

### 1. Access the Feature

- Navigate to the Users page in the application
- Click the "Bulk Upload" button in the header section

### 2. Download Template

- Click "Download Template" in the upload dialog to get a sample Excel file
- The template includes 3 example users showing the correct format for ALL available fields

### 3. Prepare Your Excel File

#### ✅ Required Columns:

- **username** - Unique username for the user (required)
- **email** - Email address (required, must be unique)

#### 📋 Basic Information (Optional):

- **password** - User password (defaults to "DefaultPassword123" if not provided)
- **role** - User role: `employee`, `admin`, `hr`, `manager`, `supervisor`, `head-of-department`, `dean` (defaults to "employee")
- **status** - User status: `active`, `vacation`, `resigned`, `inactive` (defaults to "active")
- **employeeId** - Employee ID (auto-generated as EMID-XXXX if not provided)

#### 👤 Personal Information (Optional):

- **fullName** - Full name of the user
- **firstName** - First name
- **medName** - Middle name
- **lastName** - Last name
- **arabicName** - Name in Arabic
- **dateOfBirth** - Date of birth (format: YYYY-MM-DD)
- **gender** - Gender: `male` or `female`
- **nationality** - Nationality
- **nationalId** - National ID number
- **phone** - Phone number
- **address** - Full address
- **maritalStatus** - Marital status: `single`, `married`, `divorced`, `widowed`

#### 💼 Employment Information (Optional):

- **hireDate** - Hire date (format: YYYY-MM-DD)
- **contractType** - Contract type: `full-time`, `part-time`, `contract`, `probation`
- **employmentStatus** - Employment status: `active`, `on-leave`, `vacation`, `inactive`, `terminated`, `resigned`

#### 🏖️ Vacation Balance (Optional):

- **annualTotal** - Total annual vacation days (default: 0)
- **annualUsed** - Used annual vacation days (default: 0)
- **casualTotal** - Total casual leave days (default: 7)
- **casualUsed** - Used casual leave days (default: 0)
- **flexibleTotal** - Total flexible leave days (default: 0)
- **flexibleUsed** - Used flexible leave days (default: 0)

### 4. Upload the File

- Click the upload area or drag and drop your Excel file
- Click "Upload & Create Users" to process the file

### 5. Review Results

- The system will display how many users were created successfully
- Any errors will be logged and displayed
- Common errors include:
  - Duplicate username or email
  - Missing required fields
  - Invalid data formats

## Example Excel Data

| username   | email                  | password | role     | status | employeeId | fullName             | firstName | medName   | lastName | arabicName        | dateOfBirth | gender | nationality | nationalId | phone       | address             | maritalStatus | hireDate   | contractType | employmentStatus | annualTotal | annualUsed | casualTotal | casualUsed | flexibleTotal | flexibleUsed |
| ---------- | ---------------------- | -------- | -------- | ------ | ---------- | -------------------- | --------- | --------- | -------- | ----------------- | ----------- | ------ | ----------- | ---------- | ----------- | ------------------- | ------------- | ---------- | ------------ | ---------------- | ----------- | ---------- | ----------- | ---------- | ------------- | ------------ |
| john.doe   | john.doe@example.com   | Pass123  | employee | active | EMID-0001  | John Michael Doe     | John      | Michael   | Doe      | جون مايكل دو      | 1990-01-15  | male   | American    | 123456789  | +1234567890 | 123 Main St, NY     | single        | 2020-01-15 | full-time    | active           | 21          | 5          | 7           | 2          | 3             | 0            |
| jane.smith | jane.smith@example.com | Pass456  | admin    | active | EMID-0002  | Jane Elizabeth Smith | Jane      | Elizabeth | Smith    | جين إليزابيث سميث | 1992-05-20  | female | British     | 987654321  | +0987654321 | 456 Oak Ave, London | married       | 2019-03-10 | full-time    | active           | 25          | 10         | 7           | 3          | 5             | 2            |

## Technical Details

### Backend Endpoint

- **URL**: `POST /api/users/bulk-create`
- **Authentication**: Required (Admin only)
- **Content-Type**: `multipart/form-data`
- **File Size Limit**: 5MB

### Validation

- Checks for duplicate usernames and emails
- Validates required fields
- Validates data formats and types
- Validates enum values (role, status, gender, etc.)
- Skips invalid rows and continues processing

### Response Format

```json
{
  "success": true,
  "message": "Processed 10 rows: 8 created, 2 failed",
  "created": 8,
  "failed": 2,
  "results": [
    {
      "row": 2,
      "username": "john.doe",
      "email": "john.doe@example.com",
      "success": true
    }
  ],
  "errors": [
    {
      "row": 3,
      "username": "duplicate.user",
      "error": "Email already exists"
    }
  ]
}
```

## Generating Template

You can regenerate the template file by running:

```bash
npm run create-user-template
```

## Field Details & Validation

### Date Fields

- Format: `YYYY-MM-DD` (e.g., 2020-01-15)
- Fields: dateOfBirth, hireDate

### Enum Fields

- **role**: employee, admin, hr, manager, supervisor, head-of-department, dean
- **status**: active, vacation, resigned, inactive
- **gender**: male, female
- **maritalStatus**: single, married, divorced, widowed
- **contractType**: full-time, part-time, contract, probation
- **employmentStatus**: active, on-leave, vacation, inactive, terminated, resigned

### Numeric Fields

- All vacation balance fields (annualTotal, annualUsed, etc.) should be numbers
- Defaults are applied if not provided

### Auto-Generated Fields

- **employeeId**: If not provided, automatically generated as EMID-XXXX (e.g., EMID-0001)
- **password**: If not provided, defaults to "DefaultPassword123"

## Security Notes

- Only administrators can perform bulk uploads
- Passwords are hashed before storage
- Plain passwords are stored separately for credential generation
- File size is limited to 5MB
- Only Excel files (.xls, .xlsx) are accepted
- All data is validated before insertion

## Troubleshooting

### File Upload Fails

- Check file size (must be under 5MB)
- Ensure file is in Excel format (.xlsx or .xls)
- Verify you have admin permissions

### Users Not Created

- Check for duplicate usernames/emails in your file
- Ensure required fields (username, email) are present
- Verify data formats match requirements (dates as YYYY-MM-DD)
- Check enum values are valid
- Check console for detailed error messages

### Partial Success

- The system processes rows independently
- Valid rows will be created even if some rows fail
- Review the error list to fix failed entries
- Re-upload only the failed entries after correction

### Date Format Issues

- Use YYYY-MM-DD format (e.g., 1990-01-15)
- Excel may auto-format dates - verify format before upload
- You can format cells as "Text" in Excel to prevent auto-formatting

### Vacation Balance Issues

- Ensure all vacation fields are numbers
- Used values should not exceed total values
- Negative values are not allowed

## Best Practices

1. **Start Small**: Test with 2-3 users first before uploading hundreds
2. **Use Template**: Always start with the downloaded template
3. **Verify Data**: Double-check usernames and emails for uniqueness
4. **Date Format**: Keep dates in YYYY-MM-DD format
5. **Backup**: Keep a backup of your Excel file before upload
6. **Review Errors**: Check error messages carefully and fix issues
7. **Incremental Upload**: Upload in batches rather than all at once
8. **Test Account**: Create a test user first to verify the process

## Advanced Tips

### Column Name Flexibility

The system accepts multiple column name formats:

- `username` or `Username`
- `email` or `Email`
- `fullName` or `FullName` or `Full Name`
- `phoneNumber` or `PhoneNumber` or `Phone Number` or `phone` or `Phone`

### Minimal Upload

You can upload with just the required fields:

```
username | email
---------|-------
john.doe | john.doe@example.com
```

All other fields will use default values.

### Complete Upload

For complete user profiles, include all fields from the template.

## Support & Questions

For issues or questions:

1. Check this documentation
2. Review error messages in upload response
3. Check browser console for detailed logs
4. Verify Excel file format matches template
5. Test with the sample template first
