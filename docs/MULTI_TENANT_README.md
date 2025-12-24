# 🏢 Multi-Tenant HR Management System

This system provides complete database separation for multiple companies within a single HR-SM application instance.

## 🚀 Quick Start

### 1. Seed Multi-Tenant Data
```bash
# Create 5 test companies with different modules
npm run seed-multitenant
```

### 2. List Companies
```bash
# View all created companies
npm run list-companies
```

### 3. Test the System
```bash
# Test API endpoints for all companies
npm run test-multitenant
```

## 🏢 Created Companies

The seed script creates 5 companies with different configurations:

### 1. **TechCorp Solutions** 🖥️
- **Industry**: Technology
- **Database**: `hrsm_techcorp_solutions`
- **Modules**: HR Core, Attendance, Payroll, Reports, Documents
- **Timezone**: America/Los_Angeles (PST)
- **Currency**: USD
- **Weekend**: Sunday, Saturday

**Login Credentials:**
- Admin: `admin@techcorp.com` / `admin123`
- HR: `hr@techcorp.com` / `hr123`
- Manager: `manager@techcorp.com` / `manager123`
- Employee: `john.doe@techcorp.com` / `employee123`

### 2. **Global Manufacturing Inc** 🏭
- **Industry**: Manufacturing
- **Database**: `hrsm_global_manufacturing_inc`
- **Modules**: HR Core, Attendance, Missions, Requests, Events, Payroll
- **Timezone**: America/Detroit (EST)
- **Currency**: USD
- **Weekend**: Sunday, Saturday

**Login Credentials:**
- Admin: `admin@globalmanuf.com` / `admin123`
- HR: `hr@globalmanuf.com` / `hr123`
- Manager: `manager@globalmanuf.com` / `manager123`
- Employee: `john.doe@globalmanuf.com` / `employee123`

### 3. **Healthcare Plus** 🏥
- **Industry**: Healthcare
- **Database**: `hrsm_healthcare_plus`
- **Modules**: HR Core, Attendance, Vacations, Documents, Surveys, Notifications
- **Timezone**: America/Chicago (CST)
- **Currency**: USD
- **Weekend**: Sunday only

**Login Credentials:**
- Admin: `admin@healthcareplus.com` / `admin123`
- HR: `hr@healthcareplus.com` / `hr123`
- Manager: `manager@healthcareplus.com` / `manager123`
- Employee: `john.doe@healthcareplus.com` / `employee123`

### 4. **Middle East Trading Co** 🕌
- **Industry**: Trading
- **Database**: `hrsm_middle_east_trading_co`
- **Modules**: HR Core, Attendance, Holidays, Requests, Announcements, Dashboard
- **Timezone**: Asia/Dubai (GST)
- **Currency**: AED
- **Weekend**: Friday, Saturday

**Login Credentials:**
- Admin: `admin@metradingco.com` / `admin123`
- HR: `hr@metradingco.com` / `hr123`
- Manager: `manager@metradingco.com` / `manager123`
- Employee: `john.doe@metradingco.com` / `employee123`

### 5. **European Consulting Group** 🇪🇺
- **Industry**: Consulting
- **Database**: `hrsm_european_consulting_group`
- **Modules**: HR Core, Attendance, Vacations, Missions, Reports, Theme, Surveys
- **Timezone**: Europe/Berlin (CET)
- **Currency**: EUR
- **Weekend**: Sunday, Saturday

**Login Credentials:**
- Admin: `admin@euconsulting.eu` / `admin123`
- HR: `hr@euconsulting.eu` / `hr123`
- Manager: `manager@euconsulting.eu` / `manager123`
- Employee: `john.doe@euconsulting.eu` / `employee123`

## 🔐 Authentication & Usage

### Method 1: Header-based Company Selection
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "x-company-id: techcorp_solutions" \
  -d '{
    "email": "admin@techcorp.com",
    "password": "admin123"
  }'
```

### Method 2: Query Parameter
```bash
curl -X POST "http://localhost:5000/api/auth/login?company=techcorp_solutions" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@techcorp.com",
    "password": "admin123"
  }'
```

### Method 3: JWT Token (Recommended)
After login, the JWT token contains company information:
```bash
curl -X GET http://localhost:5000/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📁 Directory Structure

Each company gets its own directories:

```
project-root/
├── backups/
│   ├── techcorp_solutions/
│   ├── global_manufacturing_inc/
│   ├── healthcare_plus/
│   ├── middle_east_trading_co/
│   └── european_consulting_group/
├── uploads/
│   ├── techcorp_solutions/
│   ├── global_manufacturing_inc/
│   ├── healthcare_plus/
│   ├── middle_east_trading_co/
│   └── european_consulting_group/
└── server/
    ├── backups/[company_folders]/
    └── uploads/[company_folders]/
```

## 🛠️ Management Commands

### Create New Company
```bash
npm run create-company -- --name "New Company Ltd" --admin-email admin@newcompany.com
```

### List All Companies
```bash
npm run list-companies
```

### Backup Companies
```bash
# Backup specific company
npm run backup-company -- --name "techcorp_solutions"

# Backup all companies
npm run backup-all-companies
```

### Test System
```bash
# Test all companies and their APIs
npm run test-multitenant
```

### Migrate Existing Data
```bash
# Migrate from single tenant to specific company
npm run migrate-to-multitenant -- --company "Existing Company"
```

## 🔧 Integration in Your App

### 1. Add Middleware to Routes
```javascript
import { tenantMiddleware, requireCompany } from './server/middleware/tenantMiddleware.js';

// Apply to all API routes
app.use('/api', tenantMiddleware);

// For routes requiring valid company
app.use('/api/employees', requireCompany);
```

### 2. Use in Route Handlers
```javascript
import { getCompanyModel } from './server/middleware/tenantMiddleware.js';

app.get('/api/employees', async (req, res) => {
    // Get Employee model for current company
    const Employee = getCompanyModel(req, 'Employee', employeeSchema);
    const employees = await Employee.find();
    res.json(employees);
});
```

### 3. Authentication Routes
```javascript
import multiTenantAuth from './server/examples/multiTenantAuth.js';
app.use('/api/auth', multiTenantAuth);
```

## 🎯 Testing Different Scenarios

### Scenario 1: Technology Company (TechCorp)
- Login as admin: `admin@techcorp.com` / `admin123`
- Test modules: Payroll, Reports, Documents
- Weekend: Sat-Sun, Working hours: 9 AM - 5 PM PST

### Scenario 2: Healthcare (Healthcare Plus)
- Login as admin: `admin@healthcareplus.com` / `admin123`
- Test modules: Vacations, Surveys, Notifications
- Weekend: Sunday only, Working hours: 7 AM - 7 PM CST

### Scenario 3: Middle East (Trading Co)
- Login as admin: `admin@metradingco.com` / `admin123`
- Test modules: Holidays, Announcements, Dashboard
- Weekend: Fri-Sat, Currency: AED, Arabic support

### Scenario 4: Manufacturing (Global Manufacturing)
- Login as admin: `admin@globalmanuf.com` / `admin123`
- Test modules: Missions, Events, Requests
- Weekend: Sat-Sun, Working hours: 8 AM - 4 PM EST

### Scenario 5: Consulting (European Group)
- Login as admin: `admin@euconsulting.eu` / `admin123`
- Test modules: Theme, Surveys, Reports
- Weekend: Sat-Sun, Currency: EUR, Timezone: CET

## 🔍 Monitoring & Troubleshooting

### Check Company Status
```bash
npm run list-companies
```

### View Logs
```bash
tail -f logs/application.log | grep "company"
```

### Database Connections
Each company database is automatically created as:
- `hrsm_techcorp_solutions`
- `hrsm_global_manufacturing_inc`
- `hrsm_healthcare_plus`
- `hrsm_middle_east_trading_co`
- `hrsm_european_consulting_group`

### Common Issues

1. **Company not found**: Ensure company was created with `npm run seed-multitenant`
2. **Login fails**: Check company identifier matches exactly
3. **Token issues**: Verify JWT contains company information
4. **Database errors**: Check MongoDB connection and permissions

## 🚀 Production Deployment

### Environment Variables
```env
MONGODB_URI=mongodb+srv://user:pass@cluster/hrms?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
NODE_ENV=production
```

### Security Considerations
- Each company's data is completely isolated
- JWT tokens include company context
- Backup files are company-specific
- Upload directories are separated by company

### Scaling
- Connection pooling per company database
- Automatic directory creation
- Efficient database switching
- Minimal memory footprint

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Company-specific login
- `POST /api/auth/verify` - Token verification
- `GET /api/auth/profile` - User profile
- `POST /api/auth/logout` - Logout

### Company Endpoints
- `GET /api/company/info` - Company information
- `GET /api/company/stats` - Company statistics

### Employee Endpoints (Example)
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

All endpoints automatically work with the correct company database based on the authentication context.

## 🎉 Success!

Your multi-tenant HR system is now ready! Each company operates independently with:
- ✅ Separate databases
- ✅ Isolated file storage
- ✅ Independent backups
- ✅ Company-specific configurations
- ✅ Role-based access control
- ✅ Different module combinations

Start testing with any of the 5 pre-configured companies!