# 🚀 Platform Quick Start Guide

## 🔐 Platform Admin Credentials

**Default Platform Admin:**
- **Email**: `platform@admin.com`
- **Password**: `PlatformAdmin123!`
- **Role**: `super-admin`

⚠️ **IMPORTANT**: Change this password after first login!

## 🏃‍♂️ Quick Start Steps

### 1. **Start the Platform Server**
```bash
# Option 1: Use the example integration server
node server/examples/platformIntegrationExample.js

# Option 2: Integrate into your existing platform app
# (Add the company routes to your platform app.js)
```

### 2. **Login to Platform**
```bash
# Test the login
npm run test-platform-login
```

**Or manually with curl:**
```bash
curl -X POST http://localhost:5001/api/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "platform@admin.com",
    "password": "PlatformAdmin123!"
  }'
```

### 3. **Access Company Management**

Once you have the JWT token from login, you can access all company management features:

```bash
# Get all companies
curl -X GET http://localhost:5001/api/platform/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get available modules and models
curl -X GET http://localhost:5001/api/platform/companies/modules-and-models \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get specific company details
curl -X GET http://localhost:5001/api/platform/companies/techcorp_solutions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🏢 Company Management Features

### **📊 View All Companies**
- See all companies with metadata and statistics
- Real-time user counts, department counts, collection counts
- Database and directory information
- Module usage per company
- **NEW**: Full frontend interface at `/companies` page

### **🔍 Company Details**
- Comprehensive company information
- User analytics by role
- Collection analysis with document counts
- Sample data preview
- Module and settings configuration

### **🏗️ Create New Company**
```bash
curl -X POST http://localhost:5001/api/platform/companies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Tech Company",
    "industry": "Technology",
    "adminEmail": "admin@newtech.com",
    "phone": "+1-555-0123",
    "address": "123 Innovation St, Tech City",
    "modules": ["hr-core", "attendance", "payroll"],
    "settings": {
      "timezone": "America/New_York",
      "currency": "USD",
      "language": "en",
      "workingHours": {"start": "09:00", "end": "17:00"},
      "weekendDays": [0, 6]
    }
  }'
```

### **⚙️ Update Company**
```bash
curl -X PATCH http://localhost:5001/api/platform/companies/company_name \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": ["hr-core", "attendance", "payroll", "reports"],
    "settings": {
      "timezone": "America/Los_Angeles"
    }
  }'
```

### **🗑️ Delete/Archive Company**
```bash
# Archive (soft delete)
curl -X DELETE http://localhost:5001/api/platform/companies/company_name \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Permanent delete
curl -X DELETE "http://localhost:5001/api/platform/companies/company_name?permanent=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎯 Current Multi-Tenant Companies

You already have **5 test companies** created:

1. **🖥️ TechCorp Solutions** - `techcorp_solutions`
   - Industry: Technology
   - Modules: hr-core, attendance, payroll, reports, documents
   - Admin: admin@techcorp.com / admin123

2. **🏭 Global Manufacturing Inc** - `global_manufacturing_inc`
   - Industry: Manufacturing  
   - Modules: hr-core, attendance, missions, requests, events, payroll
   - Admin: admin@globalmanuf.com / admin123

3. **🏥 Healthcare Plus** - `healthcare_plus`
   - Industry: Healthcare
   - Modules: hr-core, attendance, vacations, documents, surveys, notifications
   - Admin: admin@healthcareplus.com / admin123

4. **🕌 Middle East Trading Co** - `middle_east_trading_co`
   - Industry: Trading
   - Modules: hr-core, attendance, holidays, requests, announcements, dashboard
   - Admin: admin@metradingco.com / admin123

5. **🇪🇺 European Consulting Group** - `european_consulting_group`
   - Industry: Consulting
   - Modules: hr-core, attendance, vacations, missions, reports, theme, surveys
   - Admin: admin@euconsulting.eu / admin123

## 🔧 Available Modules

The platform can manage these modules for each company:

- **hr-core**: User, Department, Position, Role
- **attendance**: Attendance, ForgetCheck
- **holidays**: Holiday
- **vacations**: Vacation, SickLeave, MixedVacation, VacationBalance
- **missions**: Mission
- **requests**: Request, Permission, RequestControl
- **documents**: Document, DocumentTemplate, Hardcopy
- **events**: Event
- **announcements**: Announcement
- **notifications**: Notification
- **payroll**: Payroll
- **reports**: Report, ReportConfig, ReportExecution, ReportExport
- **surveys**: Survey, SurveyNotification
- **dashboard**: DashboardConfig
- **theme**: ThemeConfig

## 🛠️ Management Commands

```bash
# Create platform admin
npm run create-platform-admin

# Test platform login
npm run test-platform-login

# Test platform company management
npm run test-platform-companies

# List all companies (from multi-tenant system)
npm run list-companies

# Show detailed company info
npm run show-company-info

# Test database connections
npm run test-connections
```

## 🌐 Platform API Endpoints

### **Authentication**
- `POST /api/platform/auth/login` - Login platform user
- `GET /api/platform/auth/me` - Get current platform user
- `POST /api/platform/auth/logout` - Logout platform user

### **Company Management**
- `GET /api/platform/companies` - List all companies with metadata
- `GET /api/platform/companies/modules-and-models` - Get available modules/models
- `GET /api/platform/companies/:companyName` - Get detailed company information
- `POST /api/platform/companies` - Create new company
- `PATCH /api/platform/companies/:companyName` - Update company metadata
- `DELETE /api/platform/companies/:companyName` - Delete/Archive company

## 🎉 You're Ready!

Your platform is now set up with:

✅ **Platform admin user** created  
✅ **5 test companies** with different configurations  
✅ **Multi-tenant database** system working  
✅ **Company management API** ready  
✅ **Authentication system** configured  

**Next Steps:**
1. ✅ Platform server is running on port 5000
2. ✅ Platform admin frontend is running on port 3001
3. ✅ Login with platform credentials at http://localhost:3001
4. ✅ Navigate to Companies page to manage all companies
5. ✅ Use module management to enable/disable features per company
6. ✅ Create new companies through the web interface

**Security Reminder:** Change the default platform admin password in production! 🔒

## 🎯 Platform Admin Web Interface

### **Access the Platform**
1. **Open your browser** and go to: http://localhost:3001
2. **Login** with platform credentials:
   - Email: `platform@admin.com`
   - Password: `PlatformAdmin123!`

### **Companies Management Page**
Navigate to **Companies** in the sidebar to access:

#### **📋 Company Overview Cards**
- Company name, industry, and status
- User count and department statistics
- Enabled modules overview
- Database and directory paths

#### **🔧 Module Management**
- Click the **Extension icon** on any company card
- Toggle modules on/off with switches
- HR Core module is always required and cannot be disabled
- Changes are applied immediately

#### **➕ Create New Company**
- Click **"Create Company"** button
- Fill in company details:
  - Name, industry, admin email
  - Phone, address, timezone
  - Initial module selection
- Company database and directories are created automatically

#### **Available Actions per Company**
- **👁️ View Details**: ✅ See comprehensive company information, statistics, collections, and settings
- **🔧 Manage Modules**: ✅ Enable/disable features with real-time toggle switches
- **✏️ Edit Company**: ✅ Update company metadata, settings, working hours, and contact info
- **🗑️ Archive/Delete**: Soft delete or permanent removal (API ready)

### **Real-time Features**
- ✅ Live company statistics
- ✅ Instant module toggling
- ✅ Automatic database creation
- ✅ Error handling and validation
- ✅ Responsive design for all devices

### **Module Categories Available**
- **hr-core**: User, Department, Position, Role (Required)
- **attendance**: Time tracking and attendance management
- **holidays**: Holiday and calendar management
- **vacations**: Leave and vacation management
- **missions**: Business trips and missions
- **requests**: Employee requests and approvals
- **documents**: Document management system
- **events**: Company events and activities
- **announcements**: Company announcements
- **notifications**: System notifications
- **payroll**: Salary and payroll management
- **reports**: Analytics and reporting
- **surveys**: Employee surveys and feedback
- **dashboard**: Custom dashboards
- **theme**: UI customization and themes

## 🎉 You're All Set!

Your multi-tenant HR platform is now fully operational with:

✅ **6 Companies** ready for testing  
✅ **Web-based management** interface  
✅ **Module management** system  
✅ **Real-time statistics** and monitoring  
✅ **Complete API** backend  
✅ **Responsive frontend** interface  

**Start managing your companies at: http://localhost:3001** 🚀