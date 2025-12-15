# Attendance Department Filtering

## Overview

The attendance system now supports comprehensive department-based filtering across all attendance endpoints. This allows HR managers and administrators to view attendance data filtered by specific departments or multiple departments.

## Available Endpoints

### 1. Get All Attendance with Department Filtering
**Endpoint:** `GET /api/v1/attendance`

**Query Parameters:**
- `department` - Single department ID
- `departments` - Multiple department IDs (comma-separated or array)
- `employee` - Filter by specific employee ID
- `status` - Filter by attendance status (comma-separated or array)
- `startDate` - Start date for date range filtering (YYYY-MM-DD)
- `endDate` - End date for date range filtering (YYYY-MM-DD)
- `page` - Page number for pagination (default: 1)
- `limit` - Records per page (default: 50)
- `sortBy` - Sort field (default: 'date')
- `sortOrder` - Sort order: 'asc' or 'desc' (default: 'desc')

**Example Requests:**
```bash
# Get attendance for a specific department
GET /api/v1/attendance?department=60f1b2e4c8d4f123456789ab

# Get attendance for multiple departments
GET /api/v1/attendance?departments=60f1b2e4c8d4f123456789ab,60f1b2e4c8d4f123456789ac

# Get attendance with date range and department filter
GET /api/v1/attendance?department=60f1b2e4c8d4f123456789ab&startDate=2024-01-01&endDate=2024-01-31

# Get attendance with status and department filters
GET /api/v1/attendance?department=60f1b2e4c8d4f123456789ab&status=present,late

# Get attendance with pagination
GET /api/v1/attendance?department=60f1b2e4c8d4f123456789ab&page=2&limit=25
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "attendance_id",
      "employee": {
        "_id": "employee_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@company.com",
        "employeeId": "EMP001"
      },
      "department": {
        "_id": "department_id",
        "name": "Engineering",
        "code": "ENG"
      },
      "date": "2024-01-15T00:00:00.000Z",
      "status": "on-time",
      "checkIn": {
        "time": "2024-01-15T09:00:00.000Z",
        "method": "biometric",
        "location": "office"
      },
      "hours": {
        "actual": 8,
        "expected": 8
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 125,
    "limit": 25,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "on-time": { "count": 80, "totalHours": 640 },
    "late": { "count": 20, "totalHours": 160 },
    "absent": { "count": 25, "totalHours": 0 }
  },
  "departmentSummary": [
    {
      "departmentId": "60f1b2e4c8d4f123456789ab",
      "departmentName": "Engineering",
      "statusBreakdown": [
        { "status": "on-time", "count": 50, "totalHours": 400 },
        { "status": "late", "count": 10, "totalHours": 80 }
      ],
      "totalEmployees": 60,
      "totalHours": 480
    }
  ],
  "filters": {
    "department": "60f1b2e4c8d4f123456789ab",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### 2. Get Today's Attendance with Department Filtering
**Endpoint:** `GET /api/v1/attendance/today`

**Query Parameters:**
- `department` - Single department ID
- `departments` - Multiple department IDs (comma-separated or array)
- `status` - Filter by attendance status

**Example Requests:**
```bash
# Get today's attendance for a specific department
GET /api/v1/attendance/today?department=60f1b2e4c8d4f123456789ab

# Get today's attendance for multiple departments
GET /api/v1/attendance/today?departments=60f1b2e4c8d4f123456789ab,60f1b2e4c8d4f123456789ac

# Get today's present employees only
GET /api/v1/attendance/today?status=on-time,present,late
```

**Response Format:**
```json
{
  "success": true,
  "date": "2024-01-15T00:00:00.000Z",
  "summary": {
    "total": 100,
    "present": 85,
    "absent": 10,
    "late": 15,
    "earlyLeave": 5,
    "onTime": 70,
    "workFromHome": 8,
    "onLeave": 5
  },
  "departmentBreakdown": [
    {
      "departmentId": "60f1b2e4c8d4f123456789ab",
      "departmentName": "Engineering",
      "total": 50,
      "present": 45,
      "absent": 3,
      "late": 8,
      "onLeave": 2
    }
  ],
  "data": [...],
  "filters": {
    "department": "60f1b2e4c8d4f123456789ab"
  }
}
```

### 3. Get Monthly Attendance with Department Filtering
**Endpoint:** `GET /api/v1/attendance/monthly`

**Query Parameters:**
- `year` - Year (default: current year)
- `month` - Month (0-11, default: current month)
- `department` - Single department ID
- `departments` - Multiple department IDs (comma-separated or array)
- `employee` - Filter by specific employee ID

**Example Requests:**
```bash
# Get monthly attendance for a specific department
GET /api/v1/attendance/monthly?year=2024&month=0&department=60f1b2e4c8d4f123456789ab

# Get monthly attendance for multiple departments
GET /api/v1/attendance/monthly?year=2024&month=0&departments=60f1b2e4c8d4f123456789ab,60f1b2e4c8d4f123456789ac

# Get monthly attendance for specific employee in department
GET /api/v1/attendance/monthly?department=60f1b2e4c8d4f123456789ab&employee=60f1b2e4c8d4f123456789ad
```

**Response Format:**
```json
{
  "success": true,
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z",
    "month": 1,
    "year": 2024
  },
  "summary": {
    "totalRecords": 620,
    "workingDays": 500,
    "presentDays": 450,
    "absentDays": 50,
    "lateDays": 75,
    "vacationDays": 30,
    "totalHours": 3600,
    "expectedHours": 4000,
    "overtimeHours": 200
  },
  "departmentBreakdown": [
    {
      "departmentId": "60f1b2e4c8d4f123456789ab",
      "departmentName": "Engineering",
      "totalRecords": 310,
      "workingDays": 250,
      "presentDays": 225,
      "absentDays": 25,
      "lateDays": 40,
      "totalHours": 1800,
      "expectedHours": 2000,
      "overtimeHours": 100,
      "attendanceRate": 90.0
    }
  ],
  "employeeStats": [
    {
      "employee": {
        "_id": "employee_id",
        "firstName": "John",
        "lastName": "Doe"
      },
      "department": {
        "name": "Engineering"
      },
      "workingDays": 20,
      "presentDays": 18,
      "absentDays": 2,
      "lateDays": 3,
      "totalHours": 144,
      "expectedHours": 160
    }
  ],
  "data": [...],
  "filters": {
    "department": "60f1b2e4c8d4f123456789ab"
  }
}
```

### 4. Get Department Attendance Statistics
**Endpoint:** `GET /api/v1/attendance/departments`

**Query Parameters:**
- `startDate` - Start date for statistics (YYYY-MM-DD)
- `endDate` - End date for statistics (YYYY-MM-DD)
- `status` - Filter by attendance status

**Example Requests:**
```bash
# Get department statistics for current month
GET /api/v1/attendance/departments

# Get department statistics for specific date range
GET /api/v1/attendance/departments?startDate=2024-01-01&endDate=2024-01-31

# Get department statistics for specific statuses
GET /api/v1/attendance/departments?status=present,late&startDate=2024-01-01&endDate=2024-01-31
```

**Response Format:**
```json
{
  "success": true,
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.999Z"
  },
  "overallStats": {
    "totalRecords": 1240,
    "workingDays": 1000,
    "presentCount": 900,
    "absentCount": 100,
    "lateCount": 150,
    "onTimeCount": 750,
    "totalHours": 7200,
    "expectedHours": 8000,
    "overtimeHours": 400,
    "uniqueEmployeeCount": 62,
    "attendanceRate": 90.0,
    "punctualityRate": 83.33,
    "averageHoursPerDay": 7.2
  },
  "departmentStats": [
    {
      "departmentId": "60f1b2e4c8d4f123456789ab",
      "departmentName": "Engineering",
      "departmentCode": "ENG",
      "totalRecords": 620,
      "workingDays": 500,
      "presentCount": 450,
      "absentCount": 50,
      "lateCount": 75,
      "onTimeCount": 375,
      "workFromHomeCount": 25,
      "vacationCount": 15,
      "sickLeaveCount": 8,
      "missionCount": 5,
      "totalHours": 3600.0,
      "expectedHours": 4000.0,
      "overtimeHours": 200.0,
      "uniqueEmployeeCount": 31,
      "attendanceRate": 90.0,
      "punctualityRate": 83.33,
      "averageHoursPerDay": 7.2
    }
  ],
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

## Frontend Integration Examples

### React/JavaScript Examples

#### 1. Fetch Attendance by Department
```javascript
// Fetch attendance for specific department
const fetchDepartmentAttendance = async (departmentId, page = 1) => {
  try {
    const response = await fetch(
      `/api/v1/attendance?department=${departmentId}&page=${page}&limit=25`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching department attendance:', error);
  }
};

// Fetch attendance for multiple departments
const fetchMultipleDepartmentsAttendance = async (departmentIds) => {
  try {
    const deptParams = departmentIds.join(',');
    const response = await fetch(
      `/api/v1/attendance?departments=${deptParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching multiple departments attendance:', error);
  }
};
```

#### 2. Fetch Today's Department Attendance
```javascript
const fetchTodayDepartmentAttendance = async (departmentId) => {
  try {
    const response = await fetch(
      `/api/v1/attendance/today?department=${departmentId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching today\'s department attendance:', error);
  }
};
```

#### 3. Fetch Department Statistics
```javascript
const fetchDepartmentStats = async (startDate, endDate) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(
      `/api/v1/attendance/departments?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching department statistics:', error);
  }
};
```

#### 4. React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const DepartmentAttendanceFilter = () => {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Fetch attendance when department changes
  useEffect(() => {
    if (selectedDepartment) {
      fetchAttendanceByDepartment();
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/v1/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setDepartments(data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAttendanceByDepartment = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/attendance?department=${selectedDepartment}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      setAttendance(data.data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="filter-section">
        <label htmlFor="department-select">Filter by Department:</label>
        <select
          id="department-select"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept._id}>
              {dept.name} ({dept.code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div>Loading attendance data...</div>
      ) : (
        <div className="attendance-list">
          {attendance.map(record => (
            <div key={record._id} className="attendance-record">
              <span>{record.employee.firstName} {record.employee.lastName}</span>
              <span>{record.department?.name}</span>
              <span>{record.status}</span>
              <span>{new Date(record.date).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentAttendanceFilter;
```

## Benefits

### 1. **Improved Performance**
- Indexed queries on department field for fast filtering
- Pagination support to handle large datasets
- Aggregation pipelines for efficient statistics calculation

### 2. **Flexible Filtering**
- Single or multiple department filtering
- Combine with date ranges, employee filters, and status filters
- Support for various query parameter formats

### 3. **Comprehensive Statistics**
- Department-wise attendance summaries
- Employee-level statistics within departments
- Overall organizational metrics

### 4. **Better User Experience**
- Consistent response format across all endpoints
- Detailed pagination information
- Clear filter indication in responses

### 5. **Multi-tenant Support**
- All queries are automatically tenant-aware
- Complete data isolation between companies
- Secure department access control

## Best Practices

### 1. **Frontend Implementation**
- Cache department lists to avoid repeated API calls
- Implement debounced search for better performance
- Use pagination for large attendance datasets
- Show loading states during API calls

### 2. **Performance Optimization**
- Use appropriate date ranges to limit query scope
- Implement client-side caching for frequently accessed data
- Consider using WebSocket for real-time attendance updates

### 3. **Error Handling**
- Handle network errors gracefully
- Validate department IDs before making API calls
- Provide user-friendly error messages

### 4. **Security**
- Always include authentication tokens
- Validate user permissions for department access
- Sanitize query parameters on the frontend

This department filtering system provides a robust foundation for attendance management across different organizational departments while maintaining security and performance.