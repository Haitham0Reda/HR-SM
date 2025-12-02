# HR-SM (Human Resources System Management)

A comprehensive Human Resources Management System built with the MERN stack (MongoDB, Express.js, React, Node.js) designed to streamline HR operations, automate administrative tasks, and enhance employee management processes.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Design System](#design-system)
- [Advanced Features](#advanced-features)
- [API Documentation](#api-documentation)
- [Email Notification System](#email-notification-system)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

### Core HR Management

#### Employee Management
- User authentication and authorization with JWT
- Comprehensive profile management
- Role-based access control (Admin, HR, Manager, Employee)
- Department and position management
- Bulk user upload via Excel files

#### Attendance & Time Tracking
- Check-in/check-out system with real-time tracking
- Automatic work hour calculations
- Remote work tracking
- Attendance reporting and analytics
- Late arrival and early departure tracking

#### Leave & Permission Management
- Annual, casual, and sick leave tracking
- Permission requests (late arrival, early departure, overtime, mission)
- Multi-level approval workflows
- Leave balance management with automatic calculations
- Day swap requests between employees

#### Payroll Management
- Automated salary calculations
- Deduction tracking and management
- Payroll processing with reports
- Salary history tracking

#### Document Management
- Secure employee document storage
- Document templates and categories
- Confidential document handling
- Version control and audit trails

#### Communication & Notifications
- System-wide announcement system
- Real-time notification center
- Event management and calendar
- Survey system with analytics
- Email notifications for all workflows

#### Reporting & Analytics
- Comprehensive attendance reports
- Payroll reports and summaries
- Performance analytics dashboards
- Custom report builder
- Data export capabilities

#### Security & Compliance
- Complete audit logging
- Permission tracking and history
- Security settings and configurations
- Automated backup management
- Data encryption and protection

### Advanced Features

#### Unified Design System
- **50+ reusable components** organized in three layers
- **Design tokens** for consistent styling (colors, spacing, typography)
- **Light and dark mode** with automatic theme switching
- **Responsive design** with mobile-first approach
- **WCAG 2.1 AA compliant** accessibility
- **Storybook integration** for component development

#### Seasonal Effects System
- **Animated decorations** for holidays (Christmas, New Year, Eid)
- **Auto-detection** based on current date
- **Manual override** for testing and special occasions
- **Customizable settings** with opacity control
- **Mobile support** with performance optimizations
- **Accessibility-friendly** with reduced motion support

#### Bulk Operations
- **Excel-based bulk user upload** with template
- **Comprehensive validation** for all fields
- **Partial success handling** (valid rows processed)
- **Detailed error reporting** for failed entries
- **Support for all user fields** including vacation balances

#### Performance Optimizations
- **Code splitting** with React.lazy() for 60% bundle size reduction
- **Component memoization** to prevent unnecessary re-renders
- **Lazy loading** for images and routes
- **Debouncing and throttling** for search and scroll
- **Optimized API calls** with caching and deduplication

#### Email Notification System
- Automated email notifications for all request types
- Role-based notification routing
- Pending request reminders (configurable intervals)
- Approval/rejection notifications with details
- Professional HTML email templates

## Technology Stack

### Frontend
- **React 19.2**: Modern React with hooks and concurrent features
- **Material-UI v6**: Component library with custom theming
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API requests
- **Day.js**: Date manipulation and formatting
- **XLSX**: Excel file processing for bulk uploads
- **Recharts**: Data visualization and charts
- **Storybook**: Component development and documentation

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JWT**: JSON Web Tokens for authentication
- **Nodemailer**: Email sending
- **Multer**: File upload handling
- **Winston**: Logging

### Testing
- **Jest**: JavaScript testing framework
- **Supertest**: HTTP assertion library
- **React Testing Library**: React component testing
- **MongoDB Memory Server**: In-memory database for testing
- **jest-axe**: Accessibility testing

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **Docker**: Containerization (optional)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/HR-SM.git
   cd HR-SM
   ```

2. Install server dependencies:

   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:

   ```bash
   cd ../client
   npm install
   ```

4. Return to root directory:
   ```bash
   cd ..
   ```

## Configuration

1. Create a `.env` file in the server directory with the following variables:

   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

2. For email notifications, add your email service configuration:
   ```env
   EMAIL_HOST=your_email_host
   EMAIL_PORT=your_email_port
   EMAIL_USER=your_email_username
   EMAIL_PASS=your_email_password
   EMAIL_FROM=your_email_from_address
   ```

## Running the Application

### Development Mode

1. Start the server:

   ```bash
   npm run server
   ```

2. Start the client:

   ```bash
   npm run client
   ```

3. Or start both concurrently:
   ```bash
   npm run dev
   ```

### Production Mode

1. Build the client:

   ```bash
   cd client
   npm run build
   ```

2. Start the server:
   ```bash
   cd ../server
   npm start
   ```

## Design System

The application features a comprehensive unified design system for consistency and maintainability.

### Key Features

- **50+ Reusable Components**: Organized in three layers (base, composite, templates)
- **Design Tokens**: Centralized values for colors, spacing, typography, shadows
- **Theme Support**: Light and dark mode with smooth transitions
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation
- **Storybook Integration**: Interactive component playground

### Documentation

Complete design system documentation is available in the client directory:

- **[Design System Overview](client/src/DESIGN_SYSTEM_README.md)**: Introduction and index
- **[Getting Started](client/src/DESIGN_SYSTEM_GETTING_STARTED.md)**: Quick start guide
- **[Components Reference](client/src/DESIGN_SYSTEM_COMPONENTS.md)**: All components
- **[Design Tokens](client/src/DESIGN_SYSTEM_TOKENS.md)**: Token reference
- **[Common Patterns](client/src/DESIGN_SYSTEM_PATTERNS.md)**: UI patterns
- **[Extension Guide](client/src/DESIGN_SYSTEM_EXTENSION_GUIDE.md)**: Adding components

### Quick Example

```jsx
import { Button, TextField } from './components/common';
import { StatCard, ActionCard } from './components/composite';
import { designTokens } from './theme/designTokens';

// Use design tokens for consistent styling
<Box sx={{ 
  p: designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg,
  boxShadow: designTokens.shadows.md
}}>
  <Button variant="contained" color="primary">
    Click Me
  </Button>
</Box>
```

## Advanced Features

### 1. Seasonal Effects System

Animated seasonal decorations that enhance user experience during holidays:

- **Christmas**: Falling snowflakes animation
- **New Year**: Canvas-based fireworks
- **Eid al-Fitr**: Floating crescent moon
- **Eid al-Adha**: Rising lanterns

**Features:**
- Auto-detection based on current date
- Manual override for testing
- Opacity control (0.1 - 1.0)
- Mobile support toggle
- Accessibility-friendly (respects prefers-reduced-motion)

**Documentation**: [Seasonal Effects System](docs/SEASONAL_EFFECTS_SYSTEM.md)

### 2. Bulk User Upload

Upload multiple users at once via Excel files:

- Download template with example data
- Comprehensive validation for all fields
- Partial success handling (valid rows processed even if some fail)
- Detailed error reporting for failed rows
- Support for all user fields including vacation balances

**Documentation**: [Bulk User Upload Guide](docs/BULK_USER_UPLOAD.md)

### 3. Performance Optimizations

Optimized for speed and efficiency:

- **Code Splitting**: React.lazy() for route-based loading (60% bundle size reduction)
- **Memoization**: React.memo(), useMemo(), useCallback() to prevent re-renders
- **Lazy Loading**: Images and routes loaded on demand
- **Debouncing**: Search inputs and scroll events optimized
- **Context Optimization**: Memoized context values

**Results:**
- Initial bundle size: ~300KB (gzipped)
- Time to Interactive: ~2.5s on 3G
- Lighthouse Score: 90+

### 4. Storybook Integration

Interactive component development and documentation:

```bash
# Start Storybook
cd client
npm run storybook
```

Access at `http://localhost:6006` to:
- Browse all design system components
- Test components in isolation
- View component documentation
- Test accessibility
- Perform visual regression testing

## Testing

This project uses Jest for comprehensive testing with MongoDB Memory Server for isolated database testing. All tests are passing with excellent coverage across models, controllers, and routes.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate comprehensive coverage analysis report
npm run test:report
```

**Note**: The test suite uses Jest with mongodb-memory-server for isolated database testing, ensuring tests don't affect production data.

### Test Reports

The project includes an automated test report generator that creates detailed coverage analysis:

```bash
# Generate comprehensive test coverage report
npm run test:report
```

This generates:

- `TEST_REPORT_LATEST.md` - Latest test coverage analysis
- `TEST_REPORT_[DayName]_[Timestamp].md` - Timestamped report for history

Reports include:

- ✅ Executive summary with coverage percentages
- ✅ Detailed file-by-file coverage tables
- ✅ Test statistics by category (Models, Controllers, Routes)
- ✅ Function coverage examples
- ✅ Test quality metrics and recommendations

### Test Suite Statistics

**Current Status: ✅ ALL TESTS PASSING**

| Component Type  | Test Suites | Total Tests | Status              |
| --------------- | ----------- | ----------- | ------------------- |
| **Models**      | 32          | 255         | ✅ 100% Passing     |
| **Controllers** | 26          | 434         | ✅ 100% Passing     |
| **Routes**      | 25          | 413         | ✅ 100% Passing     |
| **TOTAL**       | **83**      | **1,102**   | ✅ **100% Passing** |

**Coverage:** 98.8% (83/84 files tested)

### Test Coverage

Every component has comprehensive test coverage including:

- ✅ **Unit Tests** - Individual function testing
- ✅ **Integration Tests** - Database operations and API endpoints
- ✅ **Validation Tests** - Input validation and schema validation
- ✅ **Error Handling Tests** - Invalid inputs and edge cases
- ✅ **Edge Case Tests** - Boundary conditions and special scenarios

### Test Structure

Tests are organized in the `server/testing` directory:

```
server/testing/
├── controllers/        # Controller tests (26 suites, 434 tests)
├── models/            # Model tests (32 suites, 255 tests)
├── routes/            # Route tests (25 suites, 413 tests)
└── setup.js           # Test configuration and MongoDB setup
```

### Test Documentation

For detailed testing information, see:

- `TESTING_README.md` - Complete testing guide
- `TEST_COVERAGE_ANALYSIS.md` - Detailed coverage analysis
- `VERIFICATION_SUMMARY.md` - Test verification report
- `TEST_REPORT_LATEST.md` - Latest test execution report

## Performance

### Optimization Techniques

1. **Frontend Optimizations**
   - Code splitting with React.lazy()
   - Component memoization with React.memo()
   - Hook optimization with useMemo() and useCallback()
   - Lazy image loading with Intersection Observer
   - Debouncing and throttling for events

2. **Backend Optimizations**
   - Database indexing for faster queries
   - Query optimization with Mongoose
   - Response caching where appropriate
   - Efficient pagination
   - Connection pooling

3. **Bundle Optimization**
   - Tree shaking to remove unused code
   - Code splitting for routes
   - Dynamic imports for large libraries
   - Image optimization

### Performance Metrics

- **Initial Bundle Size**: ~300KB (gzipped) - 60% reduction
- **Time to Interactive**: ~2.5s on 3G - 44% improvement
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices)
- **First Contentful Paint**: <1.5s
- **Test Coverage**: 98.8% (83/84 files tested)

## Accessibility

### Standards Compliance

- **WCAG 2.1 Level AA** compliant
- **Keyboard navigation** for all interactive elements
- **Screen reader compatible** with proper ARIA labels
- **Color contrast** ratios meet minimum requirements (4.5:1 for normal text)
- **Focus indicators** visible on all focusable elements

### Accessibility Features

1. **Keyboard Navigation**
   - All interactive elements accessible via Tab
   - Proper focus management in modals
   - Keyboard shortcuts for common actions

2. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels for all interactive elements
   - Live regions for dynamic content
   - Proper heading hierarchy

3. **Visual Accessibility**
   - High contrast mode support
   - Respects prefers-reduced-motion
   - Clear focus indicators
   - Sufficient color contrast

4. **Form Accessibility**
   - Proper label associations
   - Error messages announced to screen readers
   - Required fields indicated
   - Helper text for complex inputs

### Testing Tools

- **axe DevTools**: Automated accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Lighthouse**: Comprehensive accessibility audits
- **NVDA/VoiceOver**: Screen reader testing

**Documentation**: [Accessibility Guide](client/ACCESSIBILITY_GUIDE.md)

## API Documentation

The API follows RESTful principles and includes comprehensive endpoints for all HR functions.

### Authentication

- POST `/api/users/login` - User login
- POST `/api/users/register` - User registration
- POST `/api/users/bulk-create` - Bulk user upload (Admin only)

### Core Resources

- **Users**: Complete CRUD operations with role management
- **Schools**: School/organization management
- **Departments**: Department hierarchy and management
- **Positions**: Job positions and titles
- **Requests**: Permission, overtime, mission requests
- **Announcements**: System-wide announcements
- **Attendance**: Check-in/check-out tracking
- **Leaves**: Annual, casual, sick leave management
- **Permissions**: Late arrival, early departure tracking
- **Payroll**: Salary calculations and processing
- **Documents**: Document storage and management
- **Events**: Company events and calendar
- **Holidays**: Holiday calendar management
- **Notifications**: Real-time notifications
- **Reports**: Comprehensive reporting
- **Backups**: Automated backup management
- **Analytics**: Data analytics and insights
- **Mixed Vacations**: Vacation request management
- **Resigned Employees**: Employee resignation tracking
- **Security**: Security settings and audit logs
- **Surveys**: Employee surveys and feedback

For detailed API documentation, see [Server API Documentation](server/README.md).

## Email Notification System

### Overview

The email notification system automatically sends emails based on request types and workflow stages, ensuring the right people are notified at the right time.

### Key Features

- **Role-based notifications**: Different recipients for different request types
- **Workflow integration**: Notifications at each stage of the approval process
- **Reminder system**: Automatic reminders for pending requests
- **Professional templates**: HTML email templates for all notification types
- **Extensible design**: Easy to add new notification types

### Notification Flow

1. **General Requests** (Permission, Overtime, Mission):

   - Creation → Manager notification
   - Approval/Rejection → Employee notification

2. **Sick Leave Requests**:

   - Creation → Doctor notification
   - Doctor approval → Manager & HR notification
   - Final decision → Employee notification

3. **Day Swap Requests**:

   - Creation → Manager & HR notification
   - Approval/Rejection → Employee notification

4. **Pending Request Reminders**:
   - Daily checks for requests >2 days old
   - Appropriate reminders sent based on request type

For detailed implementation, see [Email Service Documentation](server/utils/emailService.js).

## Project Structure

```
HR-SM/
├── client/                 # React frontend
│   ├── public/             # Static assets
│   └── src/                # Source code
│       ├── components/     # React components
│       ├── context/        # React context providers
│       ├── data/           # Static data
│       ├── hooks/          # Custom hooks
│       ├── theme/          # Material-UI theme
│       └── ...
├── server/                 # Node.js backend
│   ├── config/             # Database configuration
│   ├── controller/         # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── testing/            # Comprehensive test suite
│   │   ├── controllers/    # Controller tests (26 suites, 434 tests)
│   │   ├── models/         # Model tests (32 suites, 255 tests)
│   │   ├── routes/         # Route tests (25 suites, 413 tests)
│   │   └── setup.js        # Test configuration with MongoDB Memory Server
│   ├── utils/              # Utility functions
│   └── ...
├── generate-report.js      # Automated test report generator
├── TESTING_README.md       # Testing documentation
├── TEST_COVERAGE_ANALYSIS.md  # Detailed coverage analysis
├── VERIFICATION_SUMMARY.md    # Test verification report
├── TEST_REPORT_LATEST.md      # Latest test execution report
├── .env                    # Environment variables
├── package.json            # Root package.json
└── README.md              # This file
```

## Environment Variables

The application requires several environment variables to be set. Here's a complete list:

### Server Environment Variables

| Variable   | Description                          | Required |
| ---------- | ------------------------------------ | -------- |
| PORT       | Port for the server to listen on     | Yes      |
| MONGO_URI  | MongoDB connection string            | Yes      |
| JWT_SECRET | Secret key for JWT token signing     | Yes      |
| NODE_ENV   | Environment (development/production) | Yes      |
| EMAIL_HOST | SMTP host for email service          | No       |
| EMAIL_PORT | SMTP port for email service          | No       |
| EMAIL_USER | SMTP username for email service      | No       |
| EMAIL_PASS | SMTP password for email service      | No       |
| EMAIL_FROM | Sender email address                 | No       |

## Database Schema

The application uses MongoDB with the following main collections:

### Users

- `_id`: ObjectId
- `name`: String
- `email`: String (unique)
- `password`: String (hashed)
- `role`: String (employee/manager/hr/admin)
- `department`: ObjectId (ref: Department)
- `position`: ObjectId (ref: Position)
- `createdAt`: Date
- `updatedAt`: Date

### Departments

- `_id`: ObjectId
- `name`: String
- `description`: String
- `manager`: ObjectId (ref: User)
- `createdAt`: Date
- `updatedAt`: Date

### Positions

- `_id`: ObjectId
- `title`: String
- `description`: String
- `department`: ObjectId (ref: Department)
- `createdAt`: Date
- `updatedAt`: Date

Additional schemas include: Attendance, Leave, Permission, Payroll, Document, Event, Holiday, Notification, Report, Backup, and more.

## Deployment

### Docker Deployment (Recommended)

1. Build the Docker images:

   ```bash
   docker-compose build
   ```

2. Start the services:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. Ensure all [prerequisites](#prerequisites) are installed
2. Configure environment variables
3. Build the client application:
   ```bash
   cd client && npm run build
   ```
4. Start the server:
   ```bash
   cd ../server && npm start
   ```

### Cloud Deployment

The application can be deployed to various cloud platforms:

- Heroku
- AWS (EC2, ECS, Elastic Beanstalk)
- Google Cloud Platform
- Azure

Ensure proper environment configuration and security measures are in place.

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to the branch
5. Create a pull request

Please ensure your code follows the existing style and includes appropriate tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue on the GitHub repository or contact the maintainers.
