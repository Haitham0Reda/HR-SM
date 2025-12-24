# 🏢 Platform Company Management System

A comprehensive platform interface for managing multi-tenant companies in the HR-SM system. This allows platform administrators to view, create, update, and manage all companies from a centralized interface.

## 🌟 Features

### **📊 Company Overview**
- View all companies with metadata and statistics
- Real-time statistics for users, departments, collections
- Company status monitoring (Active/Inactive)
- Database and directory information

### **🔍 Detailed Company Analytics**
- Comprehensive company information
- User analytics by role and status
- Module usage tracking
- Data distribution across collections
- Sample data preview from key collections

### **🏗️ Company Management**
- Create new companies with full setup
- Update company metadata and settings
- Enable/disable modules per company
- Archive or permanently delete companies
- Clone company structures

### **🔧 Module & Model Management**
- View all available modules and models
- See which modules are enabled per company
- Understand model relationships and dependencies
- Module categorization by functionality

## 📁 File Structure

```
server/platform/companies/
├── controllers/
│   └── companyController.js      # API request handlers
├── services/
│   └── companyService.js         # Business logic
├── routes/
│   └── companyRoutes.js          # Route definitions
└── index.js                      # Module exports
```

## 🚀 API Endpoints

### **GET /api/platform/companies**
Get all companies with metadata and statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "sanitizedName": "techcorp_solutions",
        "metadata": {
          "name": "TechCorp Solutions",
          "industry": "Technology",
          "adminEmail": "admin@techcorp.com",
          "phone": "+1-555-0101",
          "modules": ["hr-core", "attendance", "payroll"],
          "settings": {
            "timezone": "America/Los_Angeles",
            "currency": "USD",
            "language": "en"
          },
          "isActive": true,
          "createdAt": "2025-12-13T10:00:00Z"
        },
        "statistics": {
          "users": 5,
          "departments": 6,
          "totalCollections": 5
        },
        "collections": [
          {"name": "users", "type": "collection"},
          {"name": "departments", "type": "collection"}
        ],
        "database": "hrsm_techcorp_solutions",
        "backupPath": "D:\\work\\HR-SM\\backups\\techcorp_solutions",
        "uploadPath": "D:\\work\\HR-SM\\uploads\\techcorp_solutions"
      }
    ],
    "totalCompanies": 5,
    "availableModels": ["User", "Department", "Position", "..."]
  }
}
```

### **GET /api/platform/companies/:companyName**
Get detailed information about a specific company

**Response:**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "TechCorp Solutions",
      "sanitizedName": "techcorp_solutions",
      "industry": "Technology",
      "adminEmail": "admin@techcorp.com",
      "modules": ["hr-core", "attendance", "payroll"],
      "settings": {
        "timezone": "America/Los_Angeles",
        "currency": "USD",
        "workingHours": {"start": "09:00", "end": "17:00"},
        "weekendDays": [0, 6]
      }
    },
    "statistics": {
      "users": 5,
      "departments": 6,
      "positions": 5,
      "attendance": 0,
      "holidays": 1
    },
    "collections": [
      {"name": "users", "documentCount": 5},
      {"name": "departments", "documentCount": 6}
    ],
    "sampleData": {
      "users": [
        {
          "email": "admin@techcorp.com",
          "role": "admin",
          "personalInfo": {"firstName": "System", "lastName": "Administrator"}
        }
      ]
    }
  }
}
```

### **POST /api/platform/companies**
Create a new company

**Request Body:**
```json
{
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
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "New Tech Company",
      "sanitizedName": "new_tech_company",
      "database": "hrsm_new_tech_company",
      "adminEmail": "admin@newtech.com",
      "industry": "Technology",
      "modules": ["hr-core", "attendance", "payroll"]
    },
    "message": "Company created successfully"
  }
}
```

### **PATCH /api/platform/companies/:companyName**
Update company metadata

**Request Body:**
```json
{
  "phone": "+1-555-UPDATED",
  "modules": ["hr-core", "attendance", "payroll", "reports"],
  "settings": {
    "timezone": "America/Los_Angeles"
  }
}
```

### **DELETE /api/platform/companies/:companyName**
Delete or archive a company

**Query Parameters:**
- `permanent=true` - Permanently delete (drops database)
- Default: Soft delete (archive)

### **GET /api/platform/companies/modules-and-models**
Get available modules and models

**Response:**
```json
{
  "success": true,
  "data": {
    "availableModels": ["User", "Department", "Position", "Attendance", "..."],
    "moduleCategories": {
      "hr-core": ["User", "Department", "Position", "Role"],
      "attendance": ["Attendance", "ForgetCheck"],
      "payroll": ["Payroll"],
      "reports": ["Report", "ReportConfig", "ReportExecution"]
    },
    "totalModels": 25,
    "totalModules": 14
  }
}
```

## 🔧 Integration

### **1. Add to Platform App**

```javascript
import { companyRoutes } from './platform/companies/index.js';

// Add authentication middleware
const authenticatePlatform = (req, res, next) => {
  // Verify platform JWT token
  // Set req.platformUser
  next();
};

// Add routes
app.use('/api/platform/companies', authenticatePlatform, companyRoutes);
```

### **2. Environment Variables**

```env
PLATFORM_JWT_SECRET=your-platform-secret
MONGODB_URI=mongodb+srv://user:pass@cluster/hrms?retryWrites=true&w=majority
```

### **3. Frontend Integration**

```javascript
// Get all companies
const companies = await fetch('/api/platform/companies', {
  headers: {
    'Authorization': `Bearer ${platformToken}`,
    'Content-Type': 'application/json'
  }
});

// Create new company
const newCompany = await fetch('/api/platform/companies', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${platformToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'New Company',
    industry: 'Technology',
    adminEmail: 'admin@newcompany.com',
    modules: ['hr-core', 'attendance']
  })
});
```

## 🎯 Use Cases

### **1. Platform Administrator Dashboard**
- View all companies at a glance
- Monitor company statistics and health
- Quick access to company details

### **2. Company Onboarding**
- Create new company with guided setup
- Configure modules and settings
- Set up initial structure (departments, positions)

### **3. Company Management**
- Update company information
- Enable/disable modules
- Monitor usage and activity

### **4. System Administration**
- Archive inactive companies
- Backup company data
- Clone company structures for similar setups

### **5. Analytics and Reporting**
- Company usage statistics
- Module adoption rates
- System-wide metrics

## 📊 Company Statistics Provided

### **Overview Statistics**
- Total users, departments, positions
- Collection counts
- Active/inactive status

### **User Analytics**
- Users by role (admin, hr, manager, employee)
- Active vs inactive users
- Recent activity metrics

### **Module Usage**
- Enabled modules per company
- Module adoption across companies
- Feature utilization

### **Data Distribution**
- Document counts per collection
- Storage usage
- Growth trends

## 🛡️ Security Features

### **Authentication**
- Platform JWT token required
- Role-based access control
- Request tracking with unique IDs

### **Data Protection**
- Company data isolation
- Secure database connections
- Audit logging for all operations

### **Access Control**
- Platform admin permissions
- Company-specific access
- Operation-level permissions

## 🔄 Company Lifecycle Management

### **Creation**
1. Validate company data
2. Create database with sanitized name
3. Set up initial structure (departments, positions)
4. Create admin user
5. Configure modules and settings

### **Updates**
1. Validate update data
2. Update company metadata
3. Apply module changes
4. Update settings
5. Log changes for audit

### **Archival**
1. Mark company as inactive
2. Preserve data for compliance
3. Disable access for users
4. Maintain backup capabilities

### **Deletion**
1. Create final backup
2. Confirm deletion request
3. Drop database (permanent)
4. Clean up directories
5. Log deletion for audit

## 🧪 Testing

### **Run Platform Tests**
```bash
# Test all platform company management endpoints
npm run test-platform-companies
```

### **Manual Testing**
```bash
# Start platform server (example)
node server/examples/platformIntegrationExample.js

# Test endpoints with curl or Postman
curl -X GET http://localhost:5001/api/platform/companies \
  -H "Authorization: Bearer platform-token"
```

## 📈 Monitoring and Metrics

### **Company Health Metrics**
- Database connectivity
- Collection integrity
- User activity levels
- Module utilization

### **System-wide Metrics**
- Total companies
- Active vs inactive companies
- Resource usage per company
- Growth trends

### **Performance Monitoring**
- API response times
- Database query performance
- Memory usage
- Connection pool status

## 🎉 Benefits

### **For Platform Administrators**
- **Centralized Management**: Single interface for all companies
- **Real-time Insights**: Live statistics and monitoring
- **Efficient Operations**: Bulk operations and automation
- **Data-driven Decisions**: Comprehensive analytics

### **For System Operations**
- **Scalability**: Easy addition of new companies
- **Maintenance**: Simplified backup and recovery
- **Monitoring**: Health checks and alerting
- **Compliance**: Audit trails and data governance

### **For Business Growth**
- **Rapid Onboarding**: Quick setup for new clients
- **Flexible Configuration**: Customizable per company
- **Resource Optimization**: Efficient resource allocation
- **Customer Insights**: Usage patterns and adoption metrics

## 🚀 Ready to Use!

The Platform Company Management system is now fully integrated and ready to manage your multi-tenant HR system. You can:

1. **View all companies** with comprehensive statistics
2. **Create new companies** with full setup automation
3. **Manage company settings** and enabled modules
4. **Monitor system health** and usage metrics
5. **Perform administrative tasks** like backups and archival

Start managing your multi-tenant companies through the platform interface! 🎯