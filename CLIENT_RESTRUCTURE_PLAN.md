# Client Folder Restructure Plan

**Date:** November 10, 2025  
**Purpose:** Align client folder structure with server architecture

---

## Current State Analysis

### Server Structure (26 Controllers)

The server has comprehensive coverage of:

- ✅ User Management
- ✅ School & Department Management
- ✅ Attendance & Leave Management
- ✅ Payroll & Permissions
- ✅ Documents & Templates
- ✅ Notifications & Announcements
- ✅ Events & Surveys
- ✅ Reports & Analytics
- ✅ Security & Audit
- ✅ Backup Management
- ✅ Mixed Vacations
- ✅ Resigned Employees

### Current Client Structure

The client currently has:

- ⚠️ Basic employee CRUD components only
- ⚠️ No components for most server features
- ⚠️ Limited service layer
- ⚠️ Basic dashboard layout

---

## Proposed Client Structure

```
client/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
│
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── common/             # Shared components
│   │   │   ├── Layout/
│   │   │   │   ├── DashboardLayout.jsx
│   │   │   │   ├── DashboardHeader.jsx
│   │   │   │   ├── DashboardSidebar.jsx
│   │   │   │   └── PageContainer.jsx
│   │   │   ├── Forms/
│   │   │   │   ├── FormInput.jsx
│   │   │   │   ├── FormSelect.jsx
│   │   │   │   ├── FormDatePicker.jsx
│   │   │   │   └── FormFileUpload.jsx
│   │   │   ├── Tables/
│   │   │   │   ├── DataTable.jsx
│   │   │   │   ├── TablePagination.jsx
│   │   │   │   └── TableFilters.jsx
│   │   │   ├── Dialogs/
│   │   │   │   ├── ConfirmDialog.jsx
│   │   │   │   ├── FormDialog.jsx
│   │   │   │   └── AlertDialog.jsx
│   │   │   ├── Notifications/
│   │   │   │   ├── Toast.jsx
│   │   │   │   └── NotificationBadge.jsx
│   │   │   └── Loading/
│   │   │       ├── Spinner.jsx
│   │   │       └── Skeleton.jsx
│   │   │
│   │   ├── users/              # User management components
│   │   │   ├── UserList.jsx
│   │   │   ├── UserForm.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   └── UserCard.jsx
│   │   │
│   │   ├── schools/            # School management
│   │   │   ├── SchoolList.jsx
│   │   │   ├── SchoolForm.jsx
│   │   │   └── SchoolCard.jsx
│   │   │
│   │   ├── departments/        # Department management
│   │   │   ├── DepartmentList.jsx
│   │   │   ├── DepartmentForm.jsx
│   │   │   └── DepartmentTree.jsx
│   │   │
│   │   ├── positions/          # Position management
│   │   │   ├── PositionList.jsx
│   │   │   ├── PositionForm.jsx
│   │   │   └── PositionCard.jsx
│   │   │
│   │   ├── attendance/         # Attendance tracking
│   │   │   ├── AttendanceList.jsx
│   │   │   ├── AttendanceForm.jsx
│   │   │   ├── CheckInOut.jsx
│   │   │   └── AttendanceCalendar.jsx
│   │   │
│   │   ├── leaves/             # Leave management
│   │   │   ├── LeaveList.jsx
│   │   │   ├── LeaveForm.jsx
│   │   │   ├── LeaveBalance.jsx
│   │   │   └── LeaveCalendar.jsx
│   │   │
│   │   ├── permissions/        # Permission requests
│   │   │   ├── PermissionList.jsx
│   │   │   ├── PermissionForm.jsx
│   │   │   └── PermissionCard.jsx
│   │   │
│   │   ├── requests/           # General requests
│   │   │   ├── RequestList.jsx
│   │   │   ├── RequestForm.jsx
│   │   │   ├── RequestCard.jsx
│   │   │   └── RequestApproval.jsx
│   │   │
│   │   ├── payroll/            # Payroll management
│   │   │   ├── PayrollList.jsx
│   │   │   ├── PayrollForm.jsx
│   │   │   ├── PayrollSummary.jsx
│   │   │   └── SalarySlip.jsx
│   │   │
│   │   ├── documents/          # Document management
│   │   │   ├── DocumentList.jsx
│   │   │   ├── DocumentUpload.jsx
│   │   │   ├── DocumentViewer.jsx
│   │   │   └── DocumentCard.jsx
│   │   │
│   │   ├── templates/          # Document templates
│   │   │   ├── TemplateList.jsx
│   │   │   ├── TemplateForm.jsx
│   │   │   └── TemplateEditor.jsx
│   │   │
│   │   ├── announcements/      # Announcements
│   │   │   ├── AnnouncementList.jsx
│   │   │   ├── AnnouncementForm.jsx
│   │   │   └── AnnouncementCard.jsx
│   │   │
│   │   ├── notifications/      # Notifications
│   │   │   ├── NotificationList.jsx
│   │   │   ├── NotificationCenter.jsx
│   │   │   └── NotificationItem.jsx
│   │   │
│   │   ├── events/             # Event management
│   │   │   ├── EventList.jsx
│   │   │   ├── EventForm.jsx
│   │   │   ├── EventCalendar.jsx
│   │   │   └── EventCard.jsx
│   │   │
│   │   ├── surveys/            # Survey system
│   │   │   ├── SurveyList.jsx
│   │   │   ├── SurveyForm.jsx
│   │   │   ├── SurveyTake.jsx
│   │   │   └── SurveyResults.jsx
│   │   │
│   │   ├── holidays/           # Holiday management
│   │   │   ├── HolidayList.jsx
│   │   │   ├── HolidayForm.jsx
│   │   │   └── HolidayCalendar.jsx
│   │   │
│   │   ├── vacations/          # Mixed vacation policies
│   │   │   ├── VacationList.jsx
│   │   │   ├── VacationForm.jsx
│   │   │   └── VacationPolicy.jsx
│   │   │
│   │   ├── reports/            # Report generation
│   │   │   ├── ReportList.jsx
│   │   │   ├── ReportBuilder.jsx
│   │   │   ├── ReportViewer.jsx
│   │   │   └── ReportExport.jsx
│   │   │
│   │   ├── analytics/          # Analytics & KPIs
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Charts/
│   │   │   │   ├── AttendanceChart.jsx
│   │   │   │   ├── LeaveChart.jsx
│   │   │   │   └── PayrollChart.jsx
│   │   │   └── KPICards.jsx
│   │   │
│   │   ├── security/           # Security settings
│   │   │   ├── SecuritySettings.jsx
│   │   │   ├── AuditLog.jsx
│   │   │   └── PermissionAudit.jsx
│   │   │
│   │   ├── backup/             # Backup management
│   │   │   ├── BackupList.jsx
│   │   │   ├── BackupForm.jsx
│   │   │   └── BackupHistory.jsx
│   │   │
│   │   └── resigned/           # Resigned employees
│   │       ├── ResignedList.jsx
│   │       ├── ResignedForm.jsx
│   │       └── ResignedCard.jsx
│   │
│   ├── pages/                  # Page components (route containers)
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ForgotPassword.jsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── users/
│   │   │   ├── UsersPage.jsx
│   │   │   └── UserProfilePage.jsx
│   │   ├── schools/
│   │   │   └── SchoolsPage.jsx
│   │   ├── departments/
│   │   │   └── DepartmentsPage.jsx
│   │   ├── positions/
│   │   │   └── PositionsPage.jsx
│   │   ├── attendance/
│   │   │   └── AttendancePage.jsx
│   │   ├── leaves/
│   │   │   └── LeavesPage.jsx
│   │   ├── permissions/
│   │   │   └── PermissionsPage.jsx
│   │   ├── requests/
│   │   │   └── RequestsPage.jsx
│   │   ├── payroll/
│   │   │   └── PayrollPage.jsx
│   │   ├── documents/
│   │   │   └── DocumentsPage.jsx
│   │   ├── announcements/
│   │   │   └── AnnouncementsPage.jsx
│   │   ├── events/
│   │   │   └── EventsPage.jsx
│   │   ├── surveys/
│   │   │   └── SurveysPage.jsx
│   │   ├── reports/
│   │   │   └── ReportsPage.jsx
│   │   ├── analytics/
│   │   │   └── AnalyticsPage.jsx
│   │   ├── security/
│   │   │   └── SecurityPage.jsx
│   │   └── settings/
│   │       └── SettingsPage.jsx
│   │
│   ├── services/               # API service layer
│   │   ├── api.js             # Base API configuration
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── school.service.js
│   │   ├── department.service.js
│   │   ├── position.service.js
│   │   ├── attendance.service.js
│   │   ├── leave.service.js
│   │   ├── permission.service.js
│   │   ├── request.service.js
│   │   ├── payroll.service.js
│   │   ├── document.service.js
│   │   ├── template.service.js
│   │   ├── announcement.service.js
│   │   ├── notification.service.js
│   │   ├── event.service.js
│   │   ├── survey.service.js
│   │   ├── holiday.service.js
│   │   ├── vacation.service.js
│   │   ├── report.service.js
│   │   ├── analytics.service.js
│   │   ├── security.service.js
│   │   ├── backup.service.js
│   │   └── resigned.service.js
│   │
│   ├── context/                # React Context providers
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   ├── NotificationContext.js
│   │   └── DashboardSidebarContext.js
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   ├── useNotifications/
│   │   ├── useDialogs/
│   │   ├── useForm.js
│   │   ├── usePagination.js
│   │   └── useDebounce.js
│   │
│   ├── utils/                  # Utility functions
│   │   ├── formatters.js      # Date, currency, etc.
│   │   ├── validators.js      # Form validation
│   │   ├── constants.js       # App constants
│   │   ├── helpers.js         # Helper functions
│   │   └── permissions.js     # Permission checks
│   │
│   ├── routes/                 # Route configuration
│   │   ├── index.js           # Main router
│   │   ├── PrivateRoute.jsx   # Protected route wrapper
│   │   └── routes.config.js   # Route definitions
│   │
│   ├── theme/                  # Theme configuration
│   │   ├── customizations.js
│   │   ├── custom/
│   │   └── AppTheme.js
│   │
│   ├── assets/                 # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── __tests__/              # Test files
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── App.js                  # Main App component
│   ├── App.css
│   ├── index.js                # Entry point
│   ├── index.css
│   └── setupTests.js           # Test configuration
│
├── .env                        # Environment variables
├── .env.example                # Environment template
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

1. ✅ Set up service layer with API configuration
2. ✅ Create authentication context and hooks
3. ✅ Implement routing structure
4. ✅ Build common UI components (forms, tables, dialogs)
5. ✅ Set up error handling and notifications

### Phase 2: User & Organization Management (Week 2)

1. ✅ Users module (list, create, edit, profile)
2. ✅ Schools module
3. ✅ Departments module
4. ✅ Positions module
5. ✅ Role-based access control

### Phase 3: HR Operations (Week 3-4)

1. ✅ Attendance tracking
2. ✅ Leave management
3. ✅ Permission requests
4. ✅ General requests
5. ✅ Payroll management

### Phase 4: Documents & Communication (Week 5)

1. ✅ Document management
2. ✅ Document templates
3. ✅ Announcements
4. ✅ Notifications
5. ✅ Events

### Phase 5: Advanced Features (Week 6)

1. ✅ Survey system
2. ✅ Holiday management
3. ✅ Mixed vacation policies
4. ✅ Resigned employees
5. ✅ Reports & analytics

### Phase 6: Security & Administration (Week 7)

1. ✅ Security settings
2. ✅ Audit logs
3. ✅ Backup management
4. ✅ System settings
5. ✅ Admin dashboard

### Phase 7: Testing & Polish (Week 8)

1. ✅ Unit tests for components
2. ✅ Integration tests for services
3. ✅ E2E tests for critical flows
4. ✅ Performance optimization
5. ✅ Documentation

---

## Key Principles

### 1. Component Organization

- **Feature-based structure**: Group by feature/domain
- **Reusable components**: Common components in shared folder
- **Page components**: Route containers in pages folder
- **Smart vs Dumb**: Separate container and presentational components

### 2. Service Layer

- **One service per resource**: Match server controllers
- **Consistent API**: Standardized CRUD operations
- **Error handling**: Centralized error management
- **Request/Response interceptors**: Auth tokens, error handling

### 3. State Management

- **Context API**: For global state (auth, theme, notifications)
- **Local state**: For component-specific state
- **Custom hooks**: For reusable stateful logic

### 4. Routing

- **Protected routes**: Authentication required
- **Role-based access**: Permission checks
- **Lazy loading**: Code splitting for performance
- **Nested routes**: Hierarchical navigation

### 5. Styling

- **Material-UI**: Consistent design system
- **Theme customization**: Brand colors and typography
- **Responsive design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliance

---

## API Service Pattern

Each service should follow this pattern:

```javascript
// Example: user.service.js
import api from "./api";

const userService = {
  // Get all users
  getAll: (params) => api.get("/users", { params }),

  // Get user by ID
  getById: (id) => api.get(`/users/${id}`),

  // Create user
  create: (data) => api.post("/users", data),

  // Update user
  update: (id, data) => api.put(`/users/${id}`, data),

  // Delete user
  delete: (id) => api.delete(`/users/${id}`),

  // Custom endpoints
  getProfile: () => api.get("/users/profile"),
  login: (credentials) => api.post("/users/login", credentials),
};

export default userService;
```

---

## Component Pattern

Each feature component should follow this pattern:

```javascript
// Example: UserList.jsx
import React, { useState, useEffect } from "react";
import { DataTable, Loading, ErrorMessage } from "../common";
import userService from "../../services/user.service";
import { useNotifications } from "../../hooks";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      showError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <DataTable
      data={users}
      columns={columns}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
};

export default UserList;
```

---

## Environment Variables

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

---

## Next Steps

1. **Review and approve** this restructure plan
2. **Create feature branches** for each phase
3. **Set up project board** for tracking progress
4. **Assign tasks** to team members
5. **Begin Phase 1** implementation

---

**Status:** PENDING APPROVAL  
**Estimated Timeline:** 8 weeks  
**Team Size:** 2-3 developers recommended

---

_This plan aligns the client structure with the server's comprehensive HR management system, ensuring consistency and maintainability._
