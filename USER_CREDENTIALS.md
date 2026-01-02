# HR Management System - User Credentials

This document contains login credentials for the seeded companies in the HR Management System.

## System Overview

The system has been seeded with **5 companies** across different industries, each with complete HR data including users, departments, attendance records, and more. All companies use proper multi-tenant isolation with encrypted license verification.

---

## Company Login Credentials

### 1. TechCorp Solutions (Enterprise - Full Access)
- **Domain:** techcorp.com
- **Industry:** Technology
- **Employees:** 25
- **License:** Enterprise (Full Access to ALL modules)
- **Database:** `hrsm_techcorp_solutions`

**Login Credentials:**
- **Admin:** admin@techcorp.com / admin123
- **HR Manager:** hr@techcorp.com / hr123
- **All Employees:** employee123

**Available Modules (12):**
- HR Core, Attendance Management, Payroll Management
- Document Management, Employee Surveys, Medical Clinic
- Life Insurance, Advanced Reports, Executive Dashboard
- Event Management, Company Announcements, Notification System

---

### 2. Global Manufacturing Inc (Professional)
- **Domain:** globalmanuf.com
- **Industry:** Manufacturing
- **Employees:** 20
- **License:** Professional
- **Database:** `hrsm_global_manufacturing`

**Login Credentials:**
- **Admin:** admin@globalmanuf.com / admin123
- **HR Manager:** hr@globalmanuf.com / hr123
- **All Employees:** employee123

**Available Modules (8):**
- HR Core, Attendance Management, Payroll Management
- Document Management, Employee Surveys, Event Management
- Company Announcements, Notification System

---

### 3. Healthcare Plus (Professional)
- **Domain:** healthcareplus.com
- **Industry:** Healthcare
- **Employees:** 15
- **License:** Professional
- **Database:** `hrsm_healthcare_plus`

**Login Credentials:**
- **Admin:** admin@healthcareplus.com / admin123
- **HR Manager:** hr@healthcareplus.com / hr123
- **All Employees:** employee123

**Available Modules (8):**
- HR Core, Attendance Management, Payroll Management
- Document Management, Employee Surveys, Event Management
- Company Announcements, Notification System

---

### 4. Finance First (Starter)
- **Domain:** financefirst.com
- **Industry:** Finance
- **Employees:** 12
- **License:** Starter
- **Database:** `hrsm_finance_first`

**Login Credentials:**
- **Admin:** admin@financefirst.com / admin123
- **HR Manager:** hr@financefirst.com / hr123
- **All Employees:** employee123

**Available Modules (4):**
- HR Core, Attendance Management
- Company Announcements, Notification System

---

### 5. EduLearn Academy (Starter)
- **Domain:** edulearn.edu
- **Industry:** Education
- **Employees:** 10
- **License:** Starter
- **Database:** `hrsm_edulearn_academy`

**Login Credentials:**
- **Admin:** admin@edulearn.edu / admin123
- **HR Manager:** hr@edulearn.edu / hr123
- **All Employees:** employee123

**Available Modules (4):**
- HR Core, Attendance Management
- Company Announcements, Notification System

---

## System Data Summary

### Total Data Created:
- **Companies:** 5
- **Users:** 82 (across all companies)
- **Departments:** 39 (industry-specific)
- **Positions:** 38 (with proper hierarchy)
- **Attendance Records:** 300 (last 7 days)
- **Vacation Requests:** 25
- **Overtime Records:** 88
- **Tasks:** 74 (assigned to employees)
- **Documents:** 75 (contracts, certificates, etc.)
- **Surveys:** 10 (employee feedback)
- **Medical Profiles:** 8 (clinic module)
- **Medical Visits:** 10
- **Prescriptions:** 3
- **Insurance Policies:** 10
- **Resigned Employees:** 8
- **Email Logs:** 63
- **Security Audits:** 28
- **Encrypted Licenses:** 5 (all verified)

### Security Features:
- ✅ **Multi-tenant isolation** with proper tenant IDs
- ✅ **Encrypted license verification** with offline support
- ✅ **Secure token generation** for each company
- ✅ **Audit trails** for all operations
- ✅ **Role-based access control** (admin, hr, manager, employee)

### License Types:
- **Enterprise:** Full access to all 12 modules (TechCorp Solutions)
- **Professional:** Access to 8 standard modules (Global Manufacturing, Healthcare Plus)
- **Starter:** Access to 4 basic modules (Finance First, EduLearn Academy)

---

## Department Structure by Industry

### Technology (TechCorp Solutions):
- Engineering, Product Management, Quality Assurance
- DevOps, Data Science, Human Resources
- Finance, Marketing, Operations

### Manufacturing (Global Manufacturing):
- Production, Quality Control, Supply Chain
- Maintenance, Safety, Human Resources
- Finance, Logistics

### Healthcare (Healthcare Plus):
- Medical, Nursing, Administration
- Pharmacy, Laboratory, Human Resources
- Finance, IT Support

### Finance (Finance First):
- Investment Banking, Risk Management, Compliance
- Accounting, Client Relations, Human Resources
- Operations

### Education (EduLearn Academy):
- Academic Affairs, Student Services, Administration
- Library, IT Services, Human Resources
- Finance

---

## Testing Notes

1. **TechCorp Solutions** has full access to all modules including premium features like Medical Clinic and Life Insurance
2. Each company has realistic industry-specific departments and positions
3. All data includes proper tenant isolation for multi-tenant testing
4. Attendance records cover the last 7 days for performance optimization
5. Medical data is only available for companies with clinic module access
6. All licenses are encrypted and support offline validation

---

## Database Information

- **MongoDB Connection:** As configured in .env file
- **Database Naming:** `hrsm_{company_id}`
- **Total Size:** Optimized to stay well under 512MB
- **Backup Status:** Clean slate - no old data

---

*Last Updated: January 1, 2026*
*Generated by: Comprehensive Company Seeding Script*