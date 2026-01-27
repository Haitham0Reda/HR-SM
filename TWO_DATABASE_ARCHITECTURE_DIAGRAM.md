# 🏗️ Two-Database Architecture - Visual Diagram

## Your Platform's Actual Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HRSM PLATFORM ARCHITECTURE                          │
│                          Two-Database System                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────┐         ┌──────────────────────────┐        │
│  │   HR Application         │         │  Platform Admin App      │        │
│  │   (Port 3000)            │         │  (Port 3001)             │        │
│  │                          │         │                          │        │
│  │  - Employee Management   │         │  - Tenant Management     │        │
│  │  - Attendance Tracking   │         │  - License Management    │        │
│  │  - Leave Management      │         │  - Module Control        │        │
│  │  - Payroll Processing    │         │  - Subscription Billing  │        │
│  │  - 14+ Business Modules  │         │  - System Monitoring     │        │
│  │                          │         │  - Usage Analytics       │        │
│  │  Auth: Tenant JWT        │         │  Auth: Platform JWT      │        │
│  │  API: /api/v1/*          │         │  API: /api/platform/*    │        │
│  └──────────────────────────┘         └──────────────────────────┘        │
│              │                                      │                       │
└──────────────┼──────────────────────────────────────┼───────────────────────┘
               │                                      │
               │                                      │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────┐         ┌──────────────────────────┐        │
│  │   Main Backend Server    │         │  License Server          │        │
│  │   (Port 5000)            │◄────────┤  (Port 4000)             │        │
│  │                          │  Verify │                          │        │
│  │  - Tenant API Routes     │ License │  - License Validation    │        │
│  │  - Platform API Routes   │         │  - Subscription Mgmt     │        │
│  │  - Business Logic        │         │  - Module Control        │        │
│  │  - 14+ Modules           │         │  - RSA Encryption        │        │
│  │  - Tenant Middleware     │         │  - API Key Auth          │        │
│  │  - License Caching       │         │  - Rate Limiting         │        │
│  └──────────────────────────┘         └──────────────────────────┘        │
│              │                                      │                       │
└──────────────┼──────────────────────────────────────┼───────────────────────┘
               │                                      │
               │                                      │
               ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────┐   │
│  │  DATABASE 2: hrsm_platform           │  │  DATABASE 1: hrsm-licenses│  │
│  │  (Main Application Database)         │  │  (License Server DB)      │  │
│  │                                      │  │                          │   │
│  │  ALL HR DATA WITH TENANT ISOLATION:  │  │  PLATFORM CONTROL DATA:  │   │
│  │                                      │  │                          │   │
│  │  ┌────────────────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ users (tenantId)               │ │  │  │ licenses           │ │   │
│  │  │ - techcorp_solutions: 150      │ │  │  │ - Company A: Pro   │ │   │
│  │  │ - healthcare_plus: 80          │ │  │  │ - Company B: Ent   │ │   │
│  │  │ - finance_first: 200           │ │  │  │ - Company C: Trial │ │   │
│  │  └────────────────────────────────┘ │  │  └────────────────────┘ │   │
│  │                                      │  │                          │   │
│  │  ┌────────────────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ attendances (tenantId)         │ │  │  │ subscriptions      │ │   │
│  │  │ - techcorp_solutions: 5,200    │ │  │  │ - Billing info     │ │   │
│  │  │ - healthcare_plus: 2,800       │ │  │  │ - Payment history  │ │   │
│  │  │ - finance_first: 8,100         │ │  │  │ - Plan details     │ │   │
│  │  └────────────────────────────────┘ │  │  └────────────────────┘ │   │
│  │                                      │  │                          │   │
│  │  ┌────────────────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ surveys (tenantId)             │ │  │  │ enabled_modules    │ │   │
│  │  │ - techcorp_solutions: 12       │ │  │  │ - Company A: 14    │ │   │
│  │  │ - healthcare_plus: 8           │ │  │  │ - Company B: 10    │ │   │
│  │  │ - finance_first: 15            │ │  │  │ - Company C: 5     │ │   │
│  │  └────────────────────────────────┘ │  │  └────────────────────┘ │   │
│  │                                      │  │                          │   │
│  │  ┌────────────────────────────────┐ │  │  ┌────────────────────┐ │   │
│  │  │ events (tenantId)              │ │  │  │ license_validations│ │   │
│  │  │ payrolls (tenantId)            │ │  │  │ - Audit logs       │ │   │
│  │  │ departments (tenantId)         │ │  │  │ - Validation hist  │ │   │
│  │  │ vacations (tenantId)           │ │  │  └────────────────────┘ │   │
│  │  │ ... (45+ collections)          │ │  │                          │   │
│  │  └────────────────────────────────┘ │  │  Security:               │   │
│  │                                      │  │  - RSA Encryption        │   │
│  │  ┌────────────────────────────────┐ │  │  - API Key Auth          │   │
│  │  │ company_license (cached)       │ │  │  - Rate Limiting         │   │
│  │  │ - Local copy per tenant        │ │  │  - Separate deployment   │   │
│  │  │ - Syncs every 6 hours          │ │  │                          │   │
│  │  │ - Offline mode support         │ │  │                          │   │
│  │  └────────────────────────────────┘ │  │                          │   │
│  │                                      │  │                          │   │
│  │  Security:                           │  └──────────────────────────┘   │
│  │  - tenantId filtering                │                                 │
│  │  - Compound indexes                  │                                 │
│  │  - Middleware enforcement            │                                 │
│  │  - JWT with tenantId                 │                                 │
│  └──────────────────────────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 How Data Flows

### 1. User Login Flow

```
User Login
    │
    ├─► Frontend (Port 3000)
    │       │
    │       ▼
    ├─► Backend (Port 5000)
    │       │
    │       ├─► Verify credentials in hrsm_platform
    │       │   (users collection with tenantId filter)
    │       │
    │       ├─► Check cached license in hrsm_platform
    │       │   (company_license collection)
    │       │
    │       └─► If cache expired, verify with License Server
    │               │
    │               ▼
    │           License Server (Port 4000)
    │               │
    │               └─► Query hrsm-licenses database
    │                   (validate license status)
    │
    └─► Return JWT with tenantId
```

### 2. Business Operation Flow

```
Create Attendance Record
    │
    ├─► Frontend sends request with JWT
    │       │
    │       ▼
    ├─► Backend extracts tenantId from JWT
    │       │
    │       ├─► Check cached license (company_license)
    │       │   - Is license active?
    │       │   - Is attendance module enabled?
    │       │
    │       └─► If valid, save to hrsm_platform
    │           (attendances collection with tenantId)
    │
    └─► Return success
```

### 3. License Validation Flow

```
Every 6 Hours (Background Job)
    │
    ├─► Backend checks company_license.needsSync()
    │       │
    │       ▼
    ├─► Contact License Server (Port 4000)
    │       │
    │       ├─► License Server queries hrsm-licenses
    │       │   - Get latest license data
    │       │   - Check enabled modules
    │       │   - Verify expiration
    │       │
    │       └─► Return encrypted license data
    │
    └─► Update cached license in hrsm_platform
        (company_license collection)
```

## 🎯 Why This Architecture?

### Separation of Concerns

**License Server Database (`hrsm-licenses`):**
- ✅ **Platform control layer** - Who can use what
- ✅ **Billing and subscriptions** - Payment management
- ✅ **Module enablement** - Feature flags per company
- ✅ **Independent scaling** - Can scale separately
- ✅ **Security isolation** - Critical data separated

**Main Application Database (`hrsm_platform`):**
- ✅ **Business data layer** - All HR operations
- ✅ **Tenant isolation** - Data segregation via tenantId
- ✅ **Performance** - Cached licenses for fast access
- ✅ **Simplicity** - One database for all HR data
- ✅ **Cost effective** - Shared resources

### Benefits of Two-Database Approach

1. **Security**
   - License control isolated from business data
   - Compromise of one doesn't affect the other
   - Different security policies per database

2. **Performance**
   - License checks use cached data (fast)
   - Main database optimized for HR queries
   - No license server bottleneck

3. **Scalability**
   - License server scales independently
   - Main database can grow without affecting licensing
   - Can move to separate servers if needed

4. **Maintenance**
   - Update license logic without touching HR data
   - Backup strategies can differ
   - Different retention policies

5. **Cost Efficiency**
   - One database for all HR data (cheaper)
   - License database is small (low cost)
   - Better than separate DB per tenant

## 🔒 Security Model

### Database 1: `hrsm-licenses` (License Server)

```javascript
// License validation with RSA encryption
{
  licenseId: "lic_123",
  companyId: "techcorp_solutions",
  licenseType: "enterprise",
  status: "active",
  expiresAt: "2026-12-31",
  enabledModules: [
    "hr-core",
    "attendance",
    "payroll",
    "surveys",
    // ... 14 modules
  ],
  limits: {
    maxUsers: 500,
    maxStorage: "100GB"
  },
  // RSA encrypted signature
  signature: "..."
}
```

### Database 2: `hrsm_platform` (Main Application)

```javascript
// Cached license (synced every 6 hours)
{
  licenseId: "lic_123",
  companyId: "techcorp_solutions",
  encryptedLicenseData: "...", // Encrypted copy
  quickAccess: {
    licenseType: "enterprise",
    status: "active",
    expiresAt: "2026-12-31",
    maxUsers: 500,
    enabledModules: ["hr-core", "attendance", ...]
  },
  cacheInfo: {
    lastSyncedFromServer: "2026-01-24T10:00:00Z",
    nextSyncScheduled: "2026-01-24T16:00:00Z"
  }
}

// Business data with tenant isolation
{
  _id: ObjectId("..."),
  tenantId: "techcorp_solutions", // ← Isolation key
  userId: ObjectId("..."),
  checkIn: "2026-01-24T08:00:00Z",
  checkOut: "2026-01-24T17:00:00Z",
  // ... other fields
}
```

## 📊 Data Distribution

### What's in Each Database?

**`hrsm-licenses` (Small, Critical)**
- ~1,000 license records (one per company)
- ~10,000 validation logs
- ~5,000 subscription records
- **Total: ~16,000 documents**
- **Size: ~50 MB**

**`hrsm_platform` (Large, Business Data)**
- ~10,000 users (across all companies)
- ~500,000 attendance records
- ~50,000 leave requests
- ~100,000 payroll records
- ~5,000 surveys
- ... (45+ collections)
- **Total: ~1,000,000+ documents**
- **Size: ~10 GB+**

## 🚀 Scaling Strategy

### Current (< 1000 companies)
```
┌─────────────────┐
│ License Server  │ (Port 4000)
│ hrsm-licenses   │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ Main Backend    │ (Port 5000)
│ hrsm_platform   │
└─────────────────┘
```

### Future (1000+ companies)
```
┌─────────────────┐
│ License Server  │ (Port 4000)
│ hrsm-licenses   │ (Separate server)
└─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│ Main Backend    │────►│ Redis Cache     │
│ hrsm_platform   │     │ (License cache) │
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│ MongoDB Replica │
│ Set (3 nodes)   │
└─────────────────┘
```

### Enterprise (Large clients)
```
┌─────────────────┐
│ License Server  │ (Shared)
│ hrsm-licenses   │
└─────────────────┘
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ hrsm_platform│   │ tenant_ent1 │   │ tenant_ent2 │
│ (Small/Med) │   │ (Dedicated) │   │ (Dedicated) │
└─────────────┘   └─────────────┘   └─────────────┘
```

## ✅ Conclusion

Your **two-database architecture** is:

1. ✅ **Well-designed** - Proper separation of concerns
2. ✅ **Secure** - License control isolated from business data
3. ✅ **Performant** - Cached licenses, efficient queries
4. ✅ **Cost-effective** - One database for all HR data
5. ✅ **Scalable** - Can grow to thousands of companies
6. ✅ **Production-ready** - Proper indexes, middleware, validation

**This is the correct architecture for a multi-tenant SaaS platform!**
