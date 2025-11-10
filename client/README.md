# HR-SM Frontend

React-based frontend for the Human Resources Management System.

## Features

- ✅ User Authentication & Authorization
- ✅ Role-based Access Control (Admin, HR, Manager, Employee)
- ✅ Complete Service Layer (24 services)
- ✅ Material-UI Components
- ✅ Responsive Design
- ✅ Toast Notifications
- ✅ Protected Routes

## Tech Stack

- **React** 18.x
- **React Router** 6.x
- **Material-UI** 5.x
- **Axios** for API calls
- **Context API** for state management

## Getting Started

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update API URL in .env
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the App

```bash
# Development mode
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
│   ├── auth/          # Login, Register
│   └── dashboard/     # Dashboard
├── services/          # API services (24 services)
├── context/           # React Context providers
├── hooks/             # Custom React hooks
├── routes/            # Route configuration
└── theme/             # Material-UI theme
```

## Available Services

All services are located in `src/services/`:

1. auth.service.js - Authentication
2. user.service.js - User management
3. school.service.js - School management
4. department.service.js - Department management
5. position.service.js - Position management
6. attendance.service.js - Attendance tracking
7. leave.service.js - Leave management
8. permission.service.js - Permission requests
9. request.service.js - General requests
10. payroll.service.js - Payroll management
11. document.service.js - Document management
12. template.service.js - Document templates
13. announcement.service.js - Announcements
14. notification.service.js - Notifications
15. event.service.js - Event management
16. survey.service.js - Survey system
17. holiday.service.js - Holiday management
18. vacation.service.js - Mixed vacation policies
19. report.service.js - Report generation
20. analytics.service.js - Analytics & KPIs
21. security.service.js - Security settings
22. backup.service.js - Backup management
23. resigned.service.js - Resigned employees

## Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
```

## Authentication

The app uses JWT tokens stored in localStorage. All API requests automatically include the auth token via axios interceptors.

### Login

```javascript
import { useAuth } from "./hooks/useAuth";

const { login } = useAuth();
await login({ email, password, role });
```

### Protected Routes

```javascript
<PrivateRoute requiredRole="admin">
  <AdminPage />
</PrivateRoute>
```

## API Integration

All services follow a consistent pattern:

```javascript
import { userService } from "./services";

// Get all users
const users = await userService.getAll();

// Get by ID
const user = await userService.getById(id);

// Create
const newUser = await userService.create(data);

// Update
const updated = await userService.update(id, data);

// Delete
await userService.delete(id);
```

## State Management

### Auth Context

```javascript
const { user, isAuthenticated, isAdmin, isHR, login, logout } = useAuth();
```

### Notifications

```javascript
const { showSuccess, showError, showWarning, showInfo } = useNotification();
```

## Development Status

### Phase 1: Core Infrastructure ✅

- API configuration
- Authentication
- Routing
- Context providers
- Base services

### Phase 2-7: Feature Implementation 🚧

- User & Organization Management
- HR Operations
- Documents & Communication
- Advanced Features
- Security & Administration
- Testing & Polish

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT License
