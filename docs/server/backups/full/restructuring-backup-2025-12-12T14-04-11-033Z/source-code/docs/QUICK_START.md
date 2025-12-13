# HRMS Quick Start Guide

Get your HRMS system up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB 6.0+ installed and running
- Git (optional)

## Step 1: Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env file with your settings
# Minimum required:
# - MONGODB_URI
# - JWT_SECRET (generate a random 32+ character string)
```

## Step 2: Install Dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

## Step 3: Start MongoDB

```bash
# If MongoDB is not running, start it
mongod

# Or if using MongoDB as a service
sudo systemctl start mongodb
```

## Step 4: Start the Application

### Development Mode (Recommended for testing)

```bash
# Start both server and client
npm run dev
```

This will start:

- Backend server on `http://localhost:5000`
- React client on `http://localhost:3000`

### Production Mode

```bash
# Build client
cd client
npm run build
cd ..

# Start server
npm start
```

## Step 5: Create Your First Tenant

Open a new terminal and run:

```bash
curl -X POST http://localhost:5000/api/v1/hr-core/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "Admin",
    "tenantId": "mycompany",
    "companyName": "My Company Inc"
  }'
```

Save the returned token!

## Step 6: Enable Modules

```bash
# Replace YOUR_TOKEN with the token from Step 5
TOKEN="YOUR_TOKEN"

# Enable Tasks module
curl -X POST http://localhost:5000/api/v1/hr-core/tenant/modules/tasks/enable \
  -H "Authorization: Bearer $TOKEN"

# Verify enabled modules
curl -X GET http://localhost:5000/api/v1/hr-core/tenant/modules \
  -H "Authorization: Bearer $TOKEN"
```

## Step 7: Login to Web Interface

1. Open browser to `http://localhost:3000`
2. Login with:
   - Email: `admin@mycompany.com`
   - Password: `SecurePass123!`
   - Tenant ID: `mycompany`

## Step 8: Create Additional Users

### Via API

```bash
curl -X POST http://localhost:5000/api/v1/hr-core/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@mycompany.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Manager",
    "role": "Manager",
    "employeeId": "EMP001"
  }'

curl -X POST http://localhost:5000/api/v1/hr-core/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@mycompany.com",
    "password": "SecurePass123!",
    "firstName": "Jane",
    "lastName": "Employee",
    "role": "Employee",
    "employeeId": "EMP002"
  }'
```

### Via Web Interface

1. Navigate to Users section
2. Click "Add User"
3. Fill in details
4. Assign role

## Step 9: Test Task Module

### Create a Task (as Manager)

```bash
# Login as manager first
MANAGER_TOKEN=$(curl -X POST http://localhost:5000/api/v1/hr-core/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@mycompany.com",
    "password": "SecurePass123!",
    "tenantId": "mycompany"
  }' | jq -r '.data.token')

# Get employee ID
EMPLOYEE_ID=$(curl -X GET http://localhost:5000/api/v1/hr-core/users \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0]._id')

# Create task
curl -X POST http://localhost:5000/api/v1/tasks/tasks \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Complete onboarding documentation\",
    \"description\": \"Review and complete all onboarding documents\",
    \"priority\": \"high\",
    \"assignedTo\": \"$EMPLOYEE_ID\",
    \"startDate\": \"$(date -I)\",
    \"dueDate\": \"$(date -I -d '+7 days')\"
  }"
```

### Submit Report (as Employee)

```bash
# Login as employee
EMPLOYEE_TOKEN=$(curl -X POST http://localhost:5000/api/v1/hr-core/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@mycompany.com",
    "password": "SecurePass123!",
    "tenantId": "mycompany"
  }' | jq -r '.data.token')

# Get task ID
TASK_ID=$(curl -X GET http://localhost:5000/api/v1/tasks/tasks \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" | jq -r '.data[0]._id')

# Start task
curl -X PATCH http://localhost:5000/api/v1/tasks/tasks/$TASK_ID/status \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'

# Submit report
curl -X POST http://localhost:5000/api/v1/tasks/reports/task/$TASK_ID \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -F "reportText=I have completed all the onboarding documentation. This included reviewing company policies, signing necessary forms, and setting up my workstation." \
  -F 'timeSpent={"hours":2,"minutes":30}'
```

## Step 10: Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- server/modules/tasks/__tests__/task.test.js
```

## Common Issues & Solutions

### MongoDB Connection Failed

**Error**: `MongoServerError: connect ECONNREFUSED`

**Solution**:

```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb

# Or start manually
mongod --dbpath /path/to/data
```

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

### JWT Secret Not Set

**Error**: `JWT_SECRET is not defined`

**Solution**:

```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=<generated-secret>
```

### Module Not Enabled

**Error**: `Module 'tasks' is not enabled for your organization`

**Solution**:

```bash
# Enable the module
curl -X POST http://localhost:5000/api/v1/hr-core/tenant/modules/tasks/enable \
  -H "Authorization: Bearer $TOKEN"
```

## Next Steps

1. **Read Documentation**

   - [Architecture](./ARCHITECTURE.md)
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)

2. **Customize**

   - Add company logo
   - Configure email notifications
   - Set up additional modules
   - Customize roles and permissions

3. **Deploy to Production**

   - Follow [Deployment Guide](./DEPLOYMENT_GUIDE.md)
   - Set up SSL/HTTPS
   - Configure backups
   - Set up monitoring

4. **Extend**
   - Add custom modules
   - Integrate with existing systems
   - Build custom reports
   - Add automation workflows

## Useful Commands

```bash
# View logs
tail -f logs/combined.log

# Check database
mongosh hrms

# List all users
db.users.find().pretty()

# List all tasks
db.tasks.find().pretty()

# Check tenant config
db.tenantconfigs.find().pretty()

# Clear cache (restart server)
npm run server

# Build for production
cd client && npm run build

# Run linter
npm run lint

# Format code
npm run format
```

## Getting Help

- Check [API Documentation](./API_DOCUMENTATION.md) for endpoint details
- Review [Architecture](./ARCHITECTURE.md) for system design
- See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for production setup
- Check existing issues in the repository
- Contact support team

## Success Checklist

- [ ] MongoDB running
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Server started successfully
- [ ] Client accessible in browser
- [ ] Admin user created
- [ ] Modules enabled
- [ ] Test task created and completed
- [ ] Tests passing

Congratulations! Your HRMS is now running. 🎉
