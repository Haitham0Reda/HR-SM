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
- [API Documentation](#api-documentation)
- [Email Notification System](#email-notification-system)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

### Employee Management
- User authentication and authorization
- Profile management
- Role-based access control
- Department and position management

### Attendance & Time Tracking
- Check-in/check-out system
- Work hour calculations
- Remote work tracking
- Attendance reporting

### Leave & Permission Management
- Annual, casual, and sick leave tracking
- Permission requests (late arrival, early departure)
- Overtime requests
- Mission requests
- Leave balance management

### Payroll Management
- Salary calculations
- Deduction tracking
- Payroll processing

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

## Technology Stack

- **Frontend**: React, Material-UI
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest, Supertest
- **Deployment**: Docker (optional)

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

## Testing

This project uses Jest for testing with comprehensive coverage reports.

### Running Tests

```
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test categories
npm run test:models
npm run test:controllers
npm run test:middleware
npm run test:routes
```

### Test Reports

```
# Generate comprehensive test report
npm run test:report
```

### Creating New Tests

To create new test files, you can use the test template generator:

```
# Generate a test template for a controller
node scripts/generate-test-template.js controller user.controller.js

# Generate a test template for a model
node scripts/generate-test-template.js model user.model.js

# Generate a test template for middleware
node scripts/generate-test-template.js middleware authMiddleware.js

# Generate a test template for routes
node scripts/generate-test-template.js route user.routes.js

# Generate a test for a specific component (simpler interface)
node scripts/generate-component-tests.js model user
node scripts/generate-component-tests.js controller department
```

### Coverage Goals

Current Coverage Statistics:
- Statements: 18.91% (399/2109)
- Branches: 5.92% (87/1468)
- Functions: 11.74% (29/247)
- Lines: 19.26% (395/2050)

Goal: 100% coverage across all components

Refer to `Missing_Test_Files_Report.md` for a detailed list of files that need tests to achieve 100% coverage.

### Test Structure

Tests are organized in the `__tests__` directory following the same structure as the source code:

```
__tests__/
├── controllers/
├── middleware/
├── models/
└── routes/
```

## API Documentation

The API follows RESTful principles and includes comprehensive endpoints for all HR functions.

### Authentication
- POST `/api/users/login` - User login
- POST `/api/users/register` - User registration

### Core Resources
- Users
- Schools
- Departments
- Positions
- Requests
- Announcements
- Attendance
- Leaves
- Permissions
- Payroll
- Documents
- Events
- Holidays
- Notifications
- Reports
- Backups
- Analytics
- Mixed Vacations
- Resigned Employees
- Security
- Surveys

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
│   ├── testing/            # API testing suite
│   ├── utils/              # Utility functions
│   └── ...
├── .env                    # Environment variables
├── package.json            # Root package.json
└── README.md              # This file
```

## Environment Variables

The application requires several environment variables to be set. Here's a complete list:

### Server Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Port for the server to listen on | Yes |
| MONGO_URI | MongoDB connection string | Yes |
| JWT_SECRET | Secret key for JWT token signing | Yes |
| NODE_ENV | Environment (development/production) | Yes |
| EMAIL_HOST | SMTP host for email service | No |
| EMAIL_PORT | SMTP port for email service | No |
| EMAIL_USER | SMTP username for email service | No |
| EMAIL_PASS | SMTP password for email service | No |
| EMAIL_FROM | Sender email address | No |

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