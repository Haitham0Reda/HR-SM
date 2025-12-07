# Task & Work Reporting Module - Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly set up and use the Task & Work Reporting Module in your HR Management System.

## 📋 Prerequisites

1. Ensure the HRMS is installed and running
2. You have manager or admin privileges to create tasks
3. You have employee privileges to submit task reports

## 🔧 Initial Setup

### 1. Enable the Task Module

The Task module is enabled by default. To disable it:

**For Development:**

```env
FEATURE_TASKS=false
```

**For On-Premise Deployments:**
Update your `server/config/license.json`:

```json
{
  "modules": {
    "tasks": false
  }
}
```

### 2. Verify Module Availability

Navigate to the Tasks section in the sidebar. If the module is enabled, you'll see the "Tasks" menu item.

## 👥 User Roles and Permissions

### Managers and Admins

- Can create and assign tasks
- Can review and approve/reject task reports
- Can view all tasks assigned by them
- Can view all tasks assigned to their team

### Employees

- Can view tasks assigned to them
- Can update task status (start task, submit report)
- Can create and submit task reports
- Can upload files with reports
- Can resubmit reports if rejected

## 🎯 Typical Workflow

### 1. Creating a Task (Manager/Admin)

1. Navigate to the Tasks page
2. Click "Create Task"
3. Fill in task details:
   - Title and description
   - Priority (low, medium, high, urgent)
   - Assign to employee
   - Start and due dates
4. Click "Create"

### 2. Working on a Task (Employee)

1. Navigate to the Tasks page
2. Find the task in the "Assigned to Me" section
3. Click the play icon to start the task (status changes to "In Progress")
4. Work on the task as assigned

### 3. Submitting a Task Report (Employee)

1. When task is complete, click the send icon on the task
2. Fill in the report form:
   - Detailed description of work completed
   - Time spent (optional)
   - Attach files (optional, up to 5 files)
3. Click "Submit Report"
4. Task status changes to "Submitted"

### 4. Reviewing a Task Report (Manager/Admin)

1. Navigate to the Tasks page
2. Find the task in the "Assigned by Me" section with "Submitted" status
3. Click the task to view details
4. Click "Review Report"
5. Review the report details and attached files
6. Add review comments if needed
7. Choose to "Approve Task Completion" or "Reject and Request Rework"
8. Click "Submit Review"

### 5. Completing the Cycle

- **If Approved**: Task status changes to "Completed"
- **If Rejected**: Task status changes to "Rejected" and employee can rework

## 📁 File Management

### Supported File Types

- Images: JPG, PNG, GIF
- Documents: PDF, TXT, DOC, DOCX
- Spreadsheets: XLS, XLSX

### File Limits

- Maximum file size: 5MB per file
- Maximum files per report: 5

### Uploading Files

1. When submitting a report, click "Attach Files"
2. Select files from your computer
3. Uploaded files appear in the file list
4. You can remove files before submitting

### Downloading Files

1. Managers can download attached files during review
2. Click on the file chip to download

## 📊 Task Status Lifecycle

```
Assigned → In Progress → Submitted → Reviewed → Completed / Rejected
                            ↑              ↓
                            └── Rejected --┘
```

## 🔍 Advanced Features

### Filtering Tasks

- **All Tasks**: View all tasks you're involved with
- **Assigned to Me**: Tasks assigned to you
- **Assigned by Me**: Tasks you've assigned to others

### Task Lists by Status

Tasks are organized into four panels:

1. **Assigned**: Newly assigned tasks
2. **In Progress**: Tasks being worked on
3. **Submitted**: Tasks awaiting review
4. **Completed/Rejected**: Finished tasks

## 🛠️ Troubleshooting

### Task Not Visible

- Ensure you have the correct role (manager/employee)
- Check that the task module is enabled
- Verify task assignments and dates

### File Upload Issues

- Check file size (must be ≤ 5MB)
- Verify file type is supported
- Ensure you have not exceeded the 5-file limit

### Report Submission Problems

- Ensure all required fields are filled
- Check that the task is in the correct status
- Verify network connectivity

## 📞 Support

For issues or questions:

1. Check the console for error messages
2. Verify all prerequisites are met
3. Contact your system administrator
4. Refer to the full documentation in `TASK_MODULE.md`

## 🎉 You're Ready!

Your Task & Work Reporting Module is now fully operational. Start by:

1. Creating your first task as a manager
2. Assigning it to an employee
3. Following the complete workflow from assignment to completion

For detailed technical documentation, see:

- `docs/TASK_MODULE.md` - Complete module documentation
- `docs/MODULAR_ARCHITECTURE.md` - System architecture overview
