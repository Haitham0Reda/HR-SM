# HR-SM Server API

## Overview

This directory contains the server-side implementation of the HR-SM (Human Resources System Management) application. The server is built with Node.js, Express, and MongoDB, providing a comprehensive REST API for HR management functions.

## Features

### Core HR Management
- User authentication and authorization
- Employee management
- Department and position management
- School/branch management
- Role-based access control

### Attendance & Time Management
- Check-in/check-out tracking
- Attendance reporting
- Work hour calculations
- Remote work tracking

### Leave & Permission Management
- Annual, casual, and sick leave tracking
- Permission requests (late arrival, early departure)
- Overtime requests
- Mission requests
- Leave balance management

### Payroll & Financial
- Payroll processing
- Deduction tracking
- Salary calculations

### Document Management
- Employee document storage
- Document templates
- Confidential document handling

### Communication & Notifications
- Announcement system
- Notification center
- Event management
- Survey system

### Reporting & Analytics
- Attendance reports
- Payroll reports
- Performance analytics
- Custom report builder

### Security & Compliance
- Audit logging
- Permission tracking
- Security settings
- Backup management

### Email Notification System
- Automated email notifications for requests
- Role-based notification routing
- Pending request reminders
- Approval/rejection notifications

## Email Notification System

### Overview
The email notification system automatically sends emails based on request types and workflow stages. It ensures that the right people are notified at the right time.

### Notification Flow

1. **General Requests** (Permission, Overtime, Mission):
   - When created: Email sent to employee's manager
   - When approved/rejected: Email sent to employee with result

2. **Sick Leave Requests**:
   - When created: Email sent to designated doctor
   - When doctor approves: Emails sent to manager and HR
   - When manager/HR makes final decision: Email sent to employee with result

3. **Day Swap Requests**:
   - When created: Emails sent to manager and HR
   - When approved/rejected: Email sent to employee with result

4. **Pending Request Reminders**:
   - Runs daily to check for requests pending more than 2 days
   - Sends reminder emails to appropriate recipients based on request type

### Email Templates
Professional HTML email templates are provided for all notification types:
- New request notifications
- Request approval/rejection notifications
- Reminder notifications
- Specialized templates for sick leave workflow

### Configuration
The email system is designed to work with any email service. Currently, it logs emails to the console for demonstration. To use a real email service, integrate with nodemailer or similar libraries.

## API Endpoints

### Authentication
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Schools
- `GET /api/schools` - Get all schools
- `POST /api/schools` - Create school
- `GET /api/schools/:id` - Get school by ID
- `PUT /api/schools/:id` - Update school
- `DELETE /api/schools/:id` - Delete school

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `GET /api/departments/:id` - Get department by ID
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Positions
- `GET /api/positions` - Get all positions
- `POST /api/positions` - Create position
- `GET /api/positions/:id` - Get position by ID
- `PUT /api/positions/:id` - Update position
- `DELETE /api/positions/:id` - Delete position

### Requests
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create request
- `GET /api/requests/:id` - Get request by ID
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request

### Announcements
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement
- `GET /api/announcements/:id` - Get announcement by ID
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

### Attendance
- `GET /api/attendance` - Get all attendance records
- `POST /api/attendance` - Create attendance record
- `GET /api/attendance/:id` - Get attendance record by ID
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance record

### Leave Management
- `GET /api/leaves` - Get all leave records
- `POST /api/leaves` - Create leave record
- `GET /api/leaves/:id` - Get leave record by ID
- `PUT /api/leaves/:id` - Update leave record
- `DELETE /api/leaves/:id` - Delete leave record

### Permissions
- `GET /api/permissions` - Get all permissions
- `POST /api/permissions` - Create permission
- `GET /api/permissions/:id` - Get permission by ID
- `PUT /api/permissions/:id` - Update permission
- `DELETE /api/permissions/:id` - Delete permission

### Payroll
- `GET /api/payrolls` - Get all payroll records
- `POST /api/payrolls` - Create payroll record
- `GET /api/payrolls/:id` - Get payroll record by ID
- `PUT /api/payrolls/:id` - Update payroll record
- `DELETE /api/payrolls/:id` - Delete payroll record

### Documents
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Create document
- `GET /api/documents/:id` - Get document by ID
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Document Templates
- `GET /api/document-templates` - Get all document templates
- `POST /api/document-templates` - Create document template
- `GET /api/document-templates/:id` - Get document template by ID
- `PUT /api/document-templates/:id` - Update document template
- `DELETE /api/document-templates/:id` - Delete document template

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event by ID
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Holidays
- `GET /api/holidays` - Get all holidays
- `POST /api/holidays` - Create holiday
- `GET /api/holidays/:id` - Get holiday by ID
- `PUT /api/holidays/:id` - Update holiday
- `DELETE /api/holidays/:id` - Delete holiday

### Notifications
- `GET /api/notifications` - Get all notifications
- `POST /api/notifications` - Create notification
- `GET /api/notifications/:id` - Get notification by ID
- `PUT /api/notifications/:id` - Update notification
- `DELETE /api/notifications/:id` - Delete notification

### Reports
- `GET /api/reports` - Get all reports
- `POST /api/reports` - Create report
- `GET /api/reports/:id` - Get report by ID
- `PUT /api/reports/:id` - Update report
- `DELETE /api/reports/:id` - Delete report

### Backups
- `GET /api/backups` - Get all backups
- `POST /api/backups` - Create backup
- `GET /api/backups/:id` - Get backup by ID
- `PUT /api/backups/:id` - Update backup
- `DELETE /api/backups/:id` - Delete backup

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/attendance` - Get attendance analytics
- `GET /api/analytics/payroll` - Get payroll analytics
- `GET /api/analytics/leave` - Get leave analytics

### Mixed Vacations
- `GET /api/mixed-vacations` - Get all mixed vacations
- `POST /api/mixed-vacations` - Create mixed vacation
- `GET /api/mixed-vacations/:id` - Get mixed vacation by ID
- `PUT /api/mixed-vacations/:id` - Update mixed vacation
- `DELETE /api/mixed-vacations/:id` - Delete mixed vacation

### Resigned Employees
- `GET /api/resigned-employees` - Get all resigned employees
- `POST /api/resigned-employees` - Create resigned employee record
- `GET /api/resigned-employees/:id` - Get resigned employee by ID
- `PUT /api/resigned-employees/:id` - Update resigned employee record
- `DELETE /api/resigned-employees/:id` - Delete resigned employee record

### Security
- `GET /api/security/settings` - Get security settings
- `PUT /api/security/settings` - Update security settings
- `GET /api/security/audit` - Get security audit logs
- `POST /api/security/audit/cleanup` - Cleanup old audit logs

### Surveys
- `GET /api/surveys` - Get all surveys
- `POST /api/surveys` - Create survey
- `GET /api/surveys/:id` - Get survey by ID
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

## Testing

For detailed information about testing, see [testing/README.md](file:///D:/work/HR-SM/server/testing/README.md).

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License.