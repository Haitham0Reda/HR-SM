# 🏢 Multi-Tenant Company Credentials

## Login Information for All Companies

### 1. **TechCorp Solutions** 🖥️
- **Database**: `hrsm_techcorp_solutions`
- **Industry**: Technology
- **Modules**: HR Core, Attendance, Payroll, Reports, Documents
- **Timezone**: America/Los_Angeles (PST)
- **Currency**: USD

**Login Credentials:**
- **Admin**: `admin@techcorp.com` / `admin123`
- **HR Manager**: `hr@techcorp.com` / `hr123`
- **Department Manager**: `manager@techcorp.com` / `manager123`
- **Employee 1**: `john.doe@techcorp.com` / `employee123`
- **Employee 2**: `jane.smith@techcorp.com` / `employee123`

---

### 2. **Global Manufacturing Inc** 🏭
- **Database**: `hrsm_global_manufacturing_inc`
- **Industry**: Manufacturing
- **Modules**: HR Core, Attendance, Missions, Requests, Events, Payroll
- **Timezone**: America/Detroit (EST)
- **Currency**: USD

**Login Credentials:**
- **Admin**: `admin@globalmanuf.com` / `admin123`
- **HR Manager**: `hr@globalmanuf.com` / `hr123`
- **Department Manager**: `manager@globalmanuf.com` / `manager123`
- **Employee 1**: `john.doe@globalmanuf.com` / `employee123`
- **Employee 2**: `jane.smith@globalmanuf.com` / `employee123`

---

### 3. **Healthcare Plus** 🏥
- **Database**: `hrsm_healthcare_plus`
- **Industry**: Healthcare
- **Modules**: HR Core, Attendance, Vacations, Documents, Surveys, Notifications
- **Timezone**: America/Chicago (CST)
- **Currency**: USD

**Login Credentials:**
- **Admin**: `admin@healthcareplus.com` / `admin123`
- **HR Manager**: `hr@healthcareplus.com` / `hr123`
- **Department Manager**: `manager@healthcareplus.com` / `manager123`
- **Employee 1**: `john.doe@healthcareplus.com` / `employee123`
- **Employee 2**: `jane.smith@healthcareplus.com` / `employee123`

---

### 4. **Middle East Trading Co** 🕌
- **Database**: `hrsm_middle_east_trading_co`
- **Industry**: Trading
- **Modules**: HR Core, Attendance, Holidays, Requests, Announcements, Dashboard
- **Timezone**: Asia/Dubai (GST)
- **Currency**: AED
- **Language**: Arabic support

**Login Credentials:**
- **Admin**: `admin@metradingco.com` / `admin123`
- **HR Manager**: `hr@metradingco.com` / `hr123`
- **Department Manager**: `manager@metradingco.com` / `manager123`
- **Employee 1**: `john.doe@metradingco.com` / `employee123`
- **Employee 2**: `jane.smith@metradingco.com` / `employee123`

---

### 5. **European Consulting Group** 🇪🇺
- **Database**: `hrsm_european_consulting_group`
- **Industry**: Consulting
- **Modules**: HR Core, Attendance, Vacations, Missions, Reports, Theme, Surveys
- **Timezone**: Europe/Berlin (CET)
- **Currency**: EUR

**Login Credentials:**
- **Admin**: `admin@euconsulting.eu` / `admin123`
- **HR Manager**: `hr@euconsulting.eu` / `hr123`
- **Department Manager**: `manager@euconsulting.eu` / `manager123`
- **Employee 1**: `john.doe@euconsulting.eu` / `employee123`
- **Employee 2**: `jane.smith@euconsulting.eu` / `employee123`

---

## 🔧 How to Use

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

### Method 3: Frontend Login
In your frontend login form, include the company identifier:
- As a dropdown to select company
- As a hidden field based on subdomain
- As part of the login URL

## 🎯 Testing Scenarios

### Test Different Industries:
1. **Technology** (TechCorp) - Modern tech company workflow
2. **Manufacturing** (Global Manufacturing) - Industrial operations
3. **Healthcare** (Healthcare Plus) - Medical facility management
4. **Trading** (Middle East Trading) - International commerce with Arabic support
5. **Consulting** (European Consulting) - Professional services

### Test Different Modules:
- **Payroll**: TechCorp, Global Manufacturing
- **Vacations**: Healthcare Plus, European Consulting
- **Missions**: Global Manufacturing, European Consulting
- **Surveys**: Healthcare Plus, European Consulting
- **Documents**: TechCorp, Healthcare Plus
- **Events**: Global Manufacturing
- **Announcements**: Middle East Trading
- **Dashboard**: Middle East Trading
- **Theme**: European Consulting

### Test Different Settings:
- **Timezones**: PST, EST, CST, GST, CET
- **Currencies**: USD, AED, EUR
- **Weekend Days**: Different weekend configurations
- **Languages**: English and Arabic support

## 📊 Management Commands

```bash
# List all companies
npm run list-companies

# Backup specific company
npm run backup-company -- --name "techcorp_solutions"

# Backup all companies
npm run backup-all-companies

# Test the multi-tenant system
npm run test-multitenant
```

## 🗂️ Directory Structure Created

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

## 🎉 Ready for Testing!

Your multi-tenant HR system is now fully configured with 5 different companies, each with:
- ✅ Separate MongoDB databases
- ✅ Company-specific directories
- ✅ Different module combinations
- ✅ Various industry configurations
- ✅ Multiple timezone/currency settings
- ✅ Role-based user accounts

Start testing by logging into any company with the credentials above!