# 📋 Bulk Upload Template - Complete Field Reference

## Quick Overview

The Excel template now supports **27 fields** covering all aspects of user data.

---

## 🔴 REQUIRED FIELDS (2)

| Field    | Type   | Description          | Example              |
| -------- | ------ | -------------------- | -------------------- |
| username | String | Unique username      | john.doe             |
| email    | String | Unique email address | john.doe@example.com |

---

## 🔵 BASIC INFORMATION (4)

| Field      | Type   | Description   | Default            | Example                              |
| ---------- | ------ | ------------- | ------------------ | ------------------------------------ |
| password   | String | User password | DefaultPassword123 | Password123                          |
| role       | Enum   | User role     | employee           | employee, admin, hr, manager         |
| status     | Enum   | User status   | active             | active, vacation, resigned, inactive |
| employeeId | String | Employee ID   | Auto-generated     | EMID-0001                            |

**Valid Roles**: employee, admin, hr, manager, supervisor, head-of-department, dean  
**Valid Statuses**: active, vacation, resigned, inactive

---

## 🟢 PERSONAL INFORMATION (12)

| Field         | Type   | Description             | Example                            |
| ------------- | ------ | ----------------------- | ---------------------------------- |
| fullName      | String | Complete name           | John Michael Doe                   |
| firstName     | String | First name              | John                               |
| medName       | String | Middle name             | Michael                            |
| lastName      | String | Last name               | Doe                                |
| arabicName    | String | Name in Arabic          | جون مايكل دو                       |
| dateOfBirth   | Date   | Birth date (YYYY-MM-DD) | 1990-01-15                         |
| gender        | Enum   | Gender                  | male, female                       |
| nationality   | String | Nationality             | American                           |
| nationalId    | String | National ID number      | 123456789                          |
| phone         | String | Phone number            | +1234567890                        |
| address       | String | Full address            | 123 Main St, NY                    |
| maritalStatus | Enum   | Marital status          | single, married, divorced, widowed |

---

## 🟡 EMPLOYMENT INFORMATION (3)

| Field            | Type | Description            | Example                                                    |
| ---------------- | ---- | ---------------------- | ---------------------------------------------------------- |
| hireDate         | Date | Hire date (YYYY-MM-DD) | 2020-01-15                                                 |
| contractType     | Enum | Contract type          | full-time, part-time, contract, probation                  |
| employmentStatus | Enum | Employment status      | active, on-leave, vacation, inactive, terminated, resigned |

---

## 🟣 VACATION BALANCE (6)

| Field         | Type   | Description                | Default | Example |
| ------------- | ------ | -------------------------- | ------- | ------- |
| annualTotal   | Number | Total annual vacation days | 0       | 21      |
| annualUsed    | Number | Used annual vacation days  | 0       | 5       |
| casualTotal   | Number | Total casual leave days    | 7       | 7       |
| casualUsed    | Number | Used casual leave days     | 0       | 2       |
| flexibleTotal | Number | Total flexible leave days  | 0       | 3       |
| flexibleUsed  | Number | Used flexible leave days   | 0       | 0       |

---

## 📊 Field Statistics

- **Total Fields**: 27
- **Required**: 2 (7%)
- **Optional**: 25 (93%)
- **String Fields**: 17
- **Date Fields**: 2
- **Number Fields**: 6
- **Enum Fields**: 6

---

## 🎯 Usage Scenarios

### Minimal Upload (Required Only)

```
username | email
---------|-------
john.doe | john.doe@example.com
```

### Basic Upload (Common Fields)

```
username | email | password | fullName | role | status
---------|-------|----------|----------|------|-------
john.doe | john.doe@example.com | Pass123 | John Doe | employee | active
```

### Complete Upload (All Fields)

Use the downloaded template with all 27 columns filled.

---

## 🔄 Column Name Flexibility

The system accepts multiple formats for column names:

| Standard      | Alternatives                                    |
| ------------- | ----------------------------------------------- |
| fullName      | FullName, Full Name                             |
| firstName     | FirstName, First Name                           |
| dateOfBirth   | DateOfBirth, Date of Birth                      |
| phone         | phoneNumber, Phone, PhoneNumber, Phone Number   |
| nationalId    | nationalID, NationalId, NationalID, National ID |
| maritalStatus | MaritalStatus, Marital Status                   |

---

## ✅ Validation Rules

### Dates

- Format: `YYYY-MM-DD`
- Example: `1990-01-15`

### Enums

Must match exactly (case-insensitive):

- **role**: employee, admin, hr, manager, supervisor, head-of-department, dean
- **status**: active, vacation, resigned, inactive
- **gender**: male, female
- **maritalStatus**: single, married, divorced, widowed
- **contractType**: full-time, part-time, contract, probation
- **employmentStatus**: active, on-leave, vacation, inactive, terminated, resigned

### Numbers

- Must be numeric values
- No negative numbers for vacation balances
- Used values should not exceed total values

### Unique Fields

- username (must be unique across all users)
- email (must be unique across all users)
- employeeId (must be unique if provided)

---

## 📥 Template Download

Location: `client/public/templates/bulk-users-template.xlsx`

Generate new template:

```bash
npm run create-user-template
```

---

## 🎨 Sample Users in Template

### User 1: John Doe

- Role: Employee
- Nationality: American
- Status: Single
- Contract: Full-time
- Vacation: 21 total, 5 used

### User 2: Jane Smith

- Role: Admin
- Nationality: British
- Status: Married
- Contract: Full-time
- Vacation: 25 total, 10 used

### User 3: Ahmed Hassan

- Role: Manager
- Nationality: Egyptian
- Status: Married
- Contract: Full-time
- Vacation: 30 total, 15 used

---

## 💡 Pro Tips

1. **Start with Template**: Always download and use the provided template
2. **Test Small**: Upload 2-3 users first to verify format
3. **Date Format**: Keep dates as YYYY-MM-DD (format cells as Text in Excel)
4. **Required First**: Fill required fields (username, email) first
5. **Incremental**: Add optional fields as needed
6. **Backup**: Keep a copy of your Excel file
7. **Verify**: Check sample users in template for reference
8. **Arabic Names**: Copy-paste Arabic text to avoid encoding issues

---

## 🚨 Common Mistakes

❌ **Wrong date format**: `15/01/1990` or `01-15-1990`  
✅ **Correct format**: `1990-01-15`

❌ **Invalid role**: `administrator` or `user`  
✅ **Valid roles**: `admin` or `employee`

❌ **Missing required**: Only filling optional fields  
✅ **Must include**: username AND email

❌ **Duplicate data**: Same username/email for multiple users  
✅ **Unique values**: Each user needs unique username and email

---

## 📞 Need Help?

1. Check `docs/BULK_USER_UPLOAD.md` for detailed guide
2. Review sample users in template
3. Test with template data first
4. Check browser console for errors
5. Verify Excel file format

---

**All 27 fields are now available for bulk user creation!** 🎉
