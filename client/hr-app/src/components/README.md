# QuickLoginHelper Component

A development-only component that provides one-click access to **actual database users**.

## Usage

```jsx
import QuickLoginHelper from "../components/QuickLoginHelper";

<QuickLoginHelper onCredentialSelect={handleQuickLogin} type="hr" />;
```

## Available Users (HR App) - ACTUAL DATABASE USERS

### **Admin Users**

- **Admin**: admin@company.com / admin123
  - Real Name: System Administrator
  - Employee ID: EMID-0001
  - Role: admin

### **HR Manager**

- **HR Manager**: hr@company.com / hr123
  - Real Name: Sarah Ahmed
  - Employee ID: EMID-0002
  - Role: hr

### **Manager**

- **Manager**: manager@company.com / manager123
  - Real Name: Mohamed Hassan
  - Employee ID: EMID-0003
  - Role: manager

### **Employees**

- **Employee 1**: john.doe@company.com / employee123

  - Real Name: John Michael Doe
  - Employee ID: EMID-0004
  - Role: employee

- **Employee 2**: jane.smith@company.com / employee123

  - Real Name: Jane Smith
  - Employee ID: EMID-0005
  - Role: employee

- **Employee 3**: ahmed.ali@company.com / employee123

  - Real Name: Ahmed Ali
  - Employee ID: EMID-0006
  - Role: employee

- **Employee 4**: fatma.mohamed@company.com / employee123

  - Real Name: Fatma Mohamed
  - Employee ID: EMID-0007
  - Role: employee

- **Employee 5**: omar.ibrahim@company.com / employee123
  - Real Name: Omar Ibrahim
  - Employee ID: EMID-0008
  - Role: employee

⚠️ **Development only** - automatically hidden in production builds.
✅ **Real Database Users** - These are actual users seeded in the database.
