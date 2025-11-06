/**
 * Authenticated API Route Testing Script
 * Tests all routes with proper authentication
 */
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

// Test credentials
const testUsers = {
    admin: { email: 'admin@cic.edu.eg', password: 'admin123', role: 'admin' },
    hr: { email: 'hr@cic.edu.eg', password: 'hr123', role: 'hr' },
    manager: { email: 'manager@cic.edu.eg', password: 'manager123', role: 'manager' },
    employee: { email: 'john.doe@cic.edu.eg', password: 'employee123', role: 'employee' }
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logTest(method, endpoint, status, passed, error = null) {
    const icon = passed ? '✓' : '✗';
    const color = passed ? colors.green : colors.red;
    const statusColor = status >= 200 && status < 300 ? colors.green : 
                       status >= 400 && status < 500 ? colors.yellow : colors.red;
    
    console.log(`${color}${icon} ${method.padEnd(6)} ${endpoint.padEnd(50)} ${statusColor}[${status}]${colors.reset}`);
    
    if (error && !passed) {
        console.log(`     ${colors.red}Error: ${error}${colors.reset}`);
    }
    
    testResults.tests.push({ method, endpoint, status, passed, error });
    if (passed) testResults.passed++;
    else testResults.failed++;
}

async function makeRequest(method, endpoint, data = null, expectSuccess = true) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            validateStatus: () => true // Don't throw on any status
        };
        
        if (data) {
            if (method === 'GET') {
                config.params = data;
            } else {
                config.data = data;
            }
        }
        
        const response = await axios(config);
        const success = expectSuccess ? (response.status >= 200 && response.status < 300) : (response.status >= 400);
        
        logTest(method, endpoint, response.status, success, 
                !success ? JSON.stringify(response.data).substring(0, 100) : null);
        
        return response;
    } catch (error) {
        logTest(method, endpoint, 0, false, error.message);
        return null;
    }
}

async function login(userType = 'admin') {
    log(`\n${'='.repeat(60)}`, colors.blue);
    log(`  AUTHENTICATION`, colors.bold);
    log(`${'='.repeat(60)}`, colors.blue);
    
    const user = testUsers[userType];
    log(`\nLogging in as ${userType.toUpperCase()}...`, colors.yellow);
    log(`Email: ${user.email}`);
    
    const response = await axios.post(`${BASE_URL}/api/users/login`, {
        email: user.email,
        password: user.password,
        role: user.role
    });
    
    if (response.data.token) {
        authToken = response.data.token;
        log(`✓ Login successful! Token obtained.`, colors.green);
        log(`User: ${response.data.username} (${response.data.role})`, colors.green);
        return true;
    } else {
        log(`✗ Login failed!`, colors.red);
        return false;
    }
}

async function testUserRoutes() {
    log(`\n[USER ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/users');
    
    if (response && response.data && response.data.length > 0) {
        const userId = response.data[0]._id;
        await makeRequest('GET', `/api/users/${userId}`);
        await makeRequest('PUT', `/api/users/${userId}`, {
            profile: { phone: '+201234567899' }
        }, false); // May fail due to admin-only access
    }
}

async function testSchoolRoutes() {
    log(`\n[SCHOOL ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/schools');
    await makeRequest('POST', '/api/schools', {
        schoolCode: 'TEST',
        name: 'Test School',
        arabicName: 'مدرسة تجريبية'
    }, false); // Expect failure - code not in enum
}

async function testDepartmentRoutes() {
    log(`\n[DEPARTMENT ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/departments');
    
    if (response && response.data && response.data.length > 0) {
        const deptId = response.data[0]._id;
        await makeRequest('GET', `/api/departments/${deptId}`);
        await makeRequest('PUT', `/api/departments/${deptId}`, {
            description: 'Updated description'
        });
    }
    
    await makeRequest('POST', '/api/departments', {
        name: 'Test Department',
        code: 'TEST-DEPT',
        school: '507f1f77bcf86cd799439011' // Dummy ID
    }, false); // May fail due to permissions
}

async function testPositionRoutes() {
    log(`\n[POSITION ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/positions');
    
    if (response && response.data && response.data.length > 0) {
        const posId = response.data[0]._id;
        await makeRequest('GET', `/api/positions/${posId}`);
    }
}

async function testAnnouncementRoutes() {
    log(`\n[ANNOUNCEMENT ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/announcements');
    await makeRequest('GET', '/api/announcements/active');
    
    const createResponse = await makeRequest('POST', '/api/announcements', {
        title: 'Test Announcement',
        content: 'This is a test announcement',
        priority: 'medium',
        targetAudience: {
            allEmployees: true
        }
    });
    
    if (createResponse && createResponse.data && createResponse.data._id) {
        const announcementId = createResponse.data._id;
        await makeRequest('GET', `/api/announcements/${announcementId}`);
        await makeRequest('PUT', `/api/announcements/${announcementId}`, {
            title: 'Updated Test Announcement'
        });
        await makeRequest('DELETE', `/api/announcements/${announcementId}`);
    }
}

async function testAttendanceRoutes() {
    log(`\n[ATTENDANCE ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/attendance');
    
    // Create attendance record
    const createResponse = await makeRequest('POST', '/api/attendance', {
        date: new Date(),
        checkIn: new Date().toISOString(),
        status: 'present'
    });
    
    if (createResponse && createResponse.data && createResponse.data._id) {
        const attendanceId = createResponse.data._id;
        await makeRequest('GET', `/api/attendance/${attendanceId}`);
    }
}

async function testLeaveRoutes() {
    log(`\n[LEAVE ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/leaves');
    
    if (response && response.data && response.data.length > 0) {
        const leaveId = response.data[0]._id;
        await makeRequest('GET', `/api/leaves/${leaveId}`);
    }
}

async function testPermissionRoutes() {
    log(`\n[PERMISSION ROUTES]`, colors.bold);
    
    // Test getting all permissions (admin only)
    await makeRequest('GET', '/api/permissions/all');
    
    // Test getting role permissions
    await makeRequest('GET', '/api/permissions/role/admin');
    
    // Test getting current user permissions (would need user ID)
    // await makeRequest('GET', '/api/permissions/user/:userId');
}

async function testPayrollRoutes() {
    log(`\n[PAYROLL ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/payrolls');
}

async function testDocumentRoutes() {
    log(`\n[DOCUMENT ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/documents');
}

async function testDocumentTemplateRoutes() {
    log(`\n[DOCUMENT TEMPLATE ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/document-templates');
}

async function testEventRoutes() {
    log(`\n[EVENT ROUTES]`, colors.bold);
    
    const response = await makeRequest('GET', '/api/events');
    
    if (response && response.data && response.data.length > 0) {
        const eventId = response.data[0]._id;
        await makeRequest('GET', `/api/events/${eventId}`);
    }
}

async function testHolidayRoutes() {
    log(`\n[HOLIDAY ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/holidays');
    await makeRequest('GET', '/api/holidays/upcoming');
}

async function testNotificationRoutes() {
    log(`\n[NOTIFICATION ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/notifications');
    await makeRequest('GET', '/api/notifications/unread');
    await makeRequest('PUT', '/api/notifications/mark-all-read');
}

async function testRequestRoutes() {
    log(`\n[REQUEST ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/requests');
    await makeRequest('GET', '/api/requests/my-requests');
    await makeRequest('GET', '/api/requests/pending');
}

async function testReportRoutes() {
    log(`\n[REPORT ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/reports');
    await makeRequest('GET', '/api/reports/templates');
}

async function testBackupRoutes() {
    log(`\n[BACKUP ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/backups');
    await makeRequest('GET', '/api/backups/configs');
}

async function testAnalyticsRoutes() {
    log(`\n[ANALYTICS ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/analytics/dashboard');
    await makeRequest('GET', '/api/analytics/attendance');
    await makeRequest('GET', '/api/analytics/leave-statistics');
}

async function testMixedVacationRoutes() {
    log(`\n[MIXED VACATION ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/mixed-vacations');
    await makeRequest('GET', '/api/mixed-vacations/active');
}

async function testResignedEmployeeRoutes() {
    log(`\n[RESIGNED EMPLOYEE ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/resigned-employees');
}

async function testSecurityRoutes() {
    log(`\n[SECURITY ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/security/settings');
    await makeRequest('GET', '/api/security/audit');
    await makeRequest('GET', '/api/security/audit/recent');
}

async function testSurveyRoutes() {
    log(`\n[SURVEY ROUTES]`, colors.bold);
    
    await makeRequest('GET', '/api/surveys');
    await makeRequest('GET', '/api/surveys/my-surveys');
    await makeRequest('GET', '/api/surveys/active');
}

async function printSummary() {
    log(`\n${'='.repeat(60)}`, colors.blue);
    log(`  TEST SUMMARY`, colors.bold);
    log(`${'='.repeat(60)}`, colors.blue);
    
    const total = testResults.passed + testResults.failed;
    const passRate = ((testResults.passed / total) * 100).toFixed(2);
    
    log(`Total Tests:    ${total}`);
    log(`Passed:         ${testResults.passed}`, colors.green);
    log(`Failed:         ${testResults.failed}`, colors.red);
    log(`Pass Rate:      ${passRate}%`, passRate > 50 ? colors.green : colors.red);
    log(`${'='.repeat(60)}`, colors.blue);
}

async function runAllTests() {
    try {
        log(`\n${'='.repeat(60)}`, colors.blue);
        log(`  HR-SM AUTHENTICATED API TESTING`, colors.bold);
        log(`${'='.repeat(60)}`, colors.blue);
        log(`Testing against: ${BASE_URL}`, colors.yellow);
        
        // Login first
        const loginSuccess = await login('admin');
        if (!loginSuccess) {
            log('\n✗ Cannot proceed without authentication!', colors.red);
            return;
        }
        
        // Run all route tests
        await testUserRoutes();
        await testSchoolRoutes();
        await testDepartmentRoutes();
        await testPositionRoutes();
        await testAnnouncementRoutes();
        await testAttendanceRoutes();
        await testLeaveRoutes();
        await testPermissionRoutes();
        await testPayrollRoutes();
        await testDocumentRoutes();
        await testDocumentTemplateRoutes();
        await testEventRoutes();
        await testHolidayRoutes();
        await testNotificationRoutes();
        await testRequestRoutes();
        await testReportRoutes();
        await testBackupRoutes();
        await testAnalyticsRoutes();
        await testMixedVacationRoutes();
        await testResignedEmployeeRoutes();
        await testSecurityRoutes();
        await testSurveyRoutes();
        
        // Print summary
        await printSummary();
        
    } catch (error) {
        log(`\n✗ Test execution failed: ${error.message}`, colors.red);
        console.error(error);
    }
}

// Run tests
runAllTests();
