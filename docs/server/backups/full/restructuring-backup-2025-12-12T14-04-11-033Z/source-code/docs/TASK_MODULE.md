# Task & Work Reporting Module

## Overview

The Task & Work Reporting Module is designed for accountability and performance tracking between managers and employees. It allows managers to assign tasks to employees, who then submit detailed reports upon completion.

## Features

### Task Management

- Managers can assign tasks to employees
- Tasks include: title, description, priority, assignee, assigner, start date, due date, and status
- Task status lifecycle: Assigned → In Progress → Submitted → Reviewed → Completed / Rejected

### Employee Task Reports

- Employees must submit a written report for each task
- Reports allow:
  - Detailed text description of work done
  - Optional time spent
  - Uploading one or more files (documents, images, PDFs)
- Employees can resubmit reports if rejected

### Manager Review Flow

- Managers review submitted reports
- Managers can:
  - View report text
  - Download uploaded files
  - Leave review comments
  - Approve or reject the task

## Data Models

### Task Model

```javascript
{
  title: String,
  description: String,
  priority: Enum['low', 'medium', 'high', 'urgent'],
  assignee: ObjectId (User),
  assigner: ObjectId (User),
  startDate: Date,
  dueDate: Date,
  status: Enum['assigned', 'in-progress', 'submitted', 'reviewed', 'completed', 'rejected'],
  tenantId: String
}
```

### TaskReport Model

```javascript
{
  taskId: ObjectId (Task),
  reportText: String,
  timeSpent: Number, // in minutes
  files: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }],
  status: Enum['draft', 'submitted', 'approved', 'rejected'],
  reviewComments: String,
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: ObjectId (User),
  tenantId: String
}
```

## Task Status Lifecycle

```
Assigned → In Progress → Submitted → Reviewed → Completed / Rejected
                            ↑              ↓
                            └── Rejected --┘
```

Tasks cannot be marked completed unless the employee submits a report.

## API Endpoints

### Task Management

- `GET /api/tasks` - Get all tasks for current user
- `POST /api/tasks` - Create new task (Manager+)
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/status` - Update task status

### Task Reports

- `GET /api/tasks/:id/reports` - Get task reports
- `POST /api/tasks/:id/reports` - Create/update task report
- `POST /api/tasks/:id/reports/submit` - Submit task report
- `POST /api/tasks/:id/reports/review` - Review task report (Manager+)
- `POST /api/tasks/:id/reports/upload` - Upload file for report
- `GET /api/tasks/files/:fileId` - Download report file

## File Uploads

- Secure file uploads with size and type limits
- Supported file types: JPG, PNG, GIF, PDF, TXT, DOC, DOCX, XLS, XLSX
- Maximum file size: 5MB per file
- Maximum 5 files per report
- Files stored separately from general document storage
- Access control enforced for uploaded files

## Notifications

The system sends notifications (email + in-app) for:

- Task assignment
- Task submission
- Task approval or rejection

## Role-Based Access Control

### Managers and Above (Manager, HR, Admin)

- Create tasks
- Assign tasks to employees
- Review and approve/reject task reports
- View all tasks assigned by them
- View all tasks assigned to their team members

### Employees

- View tasks assigned to them
- Update task status (start task, submit report)
- Create and submit task reports
- Upload files with reports
- Resubmit reports if rejected

## Implementation Details

### Backend

- Built with Node.js and Express.js
- MongoDB with Mongoose for data storage
- Multer for file uploads
- Feature flag protection for module enablement
- Multi-tenant support with tenantId field
- RBAC middleware for access control

### Frontend

- React with Material-UI components
- Responsive design for desktop and mobile
- Context API for state management
- Axios for API communication
- File upload handling
- Form validation

## Testing

Unit tests are implemented for:

- Task model validation
- TaskReport model validation
- API endpoint testing
- Feature flag integration

## Deployment

The module is deployed as part of the main HRMS application and can be enabled/disabled via:

- Environment variables (development)
- License files (On-Premise)
- Database configuration (SaaS)

## Security

- JWT authentication for all endpoints
- Role-based access control
- File type and size validation
- Secure file storage
- Input sanitization
- Audit logging
