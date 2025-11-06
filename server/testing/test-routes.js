/**
 * Automated API Route Testing Script
 * 
 * Run with: node server/test-routes.js
 * 
 * Prerequisites:
 * 1. Server must be running on PORT (default: 5000)
 * 2. MongoDB must be connected
 * 3. Update credentials and IDs as needed
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
let authToken = '';
let testData = {};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Make HTTP request
 */
async function makeRequest(method, endpoint, data = null, useAuth = true) {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (useAuth && authToken) {
        options.headers['Cookie'] = `token=${authToken}`;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');
        let responseData;

        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        return {
            status: response.status,
            ok: response.ok,
            data: responseData,
            headers: response.headers
        };
    } catch (error) {
        return {
            status: 0,
            ok: false,
            error: error.message
        };
    }
}

/**
 * Test result logger
 */
function logTest(routeName, method, endpoint, result) {
    const status = result.ok ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    const statusCode = result.status ? `[${result.status}]` : '[ERR]';

    console.log(`${status} ${colors.cyan}${method.padEnd(6)}${colors.reset} ${endpoint.padEnd(50)} ${statusCode}`);

    if (!result.ok && result.data) {
        console.log(`     ${colors.yellow}Error: ${JSON.stringify(result.data).substring(0, 100)}${colors.reset}`);
    }
}

/**
 * Test suite runner
 */
async function runTests() {
    console.log(`\n${colors.blue}========================================`);
    console.log('  HR-SM API ROUTE TESTING');
    console.log(`========================================${colors.reset}\n`);
    console.log(`Testing against: ${BASE_URL}\n`);

    let passed = 0;
    let failed = 0;

    // ==========================================
    // ROOT ENDPOINT
    // ==========================================
    console.log(`\n${colors.cyan}[ROOT ENDPOINT]${colors.reset}`);

    let result = await makeRequest('GET', '/', null, false);
    logTest('Root', 'GET', '/', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // USER ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[USER ROUTES]${colors.reset}`);

    // Register user
    result = await makeRequest('POST', '/api/users/register', {
        username: 'testuser_' + Date.now(),
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
        role: 'employee'
    }, false);
    logTest('User', 'POST', '/api/users/register', result);
    result.ok ? passed++ : failed++;

    // Login user
    result = await makeRequest('POST', '/api/users/login', {
        email: 'admin@example.com',
        password: 'admin123'
    }, false);
    logTest('User', 'POST', '/api/users/login', result);
    result.ok ? passed++ : failed++;

    // Extract token from cookie if login successful
    if (result.ok && result.headers.get('set-cookie')) {
        const cookieHeader = result.headers.get('set-cookie');
        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (tokenMatch) authToken = tokenMatch[1];
    }

    // Get all users
    result = await makeRequest('GET', '/api/users');
    logTest('User', 'GET', '/api/users', result);
    result.ok ? passed++ : failed++;

    // Get user profile
    result = await makeRequest('GET', '/api/users/profile');
    logTest('User', 'GET', '/api/users/profile', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // ANNOUNCEMENT ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[ANNOUNCEMENT ROUTES]${colors.reset}`);

    // Get all announcements
    result = await makeRequest('GET', '/api/announcements');
    logTest('Announcement', 'GET', '/api/announcements', result);
    result.ok ? passed++ : failed++;

    // Create announcement
    result = await makeRequest('POST', '/api/announcements', {
        title: 'Test Announcement',
        content: 'Test content',
        priority: 'normal',
        targetAudience: { allEmployees: true }
    });
    logTest('Announcement', 'POST', '/api/announcements', result);
    result.ok ? passed++ : failed++;
    if (result.ok && result.data?.announcement?._id) {
        testData.announcementId = result.data.announcement._id;
    }

    // ==========================================
    // ANALYTICS ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[ANALYTICS ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/analytics/hr-dashboard');
    logTest('Analytics', 'GET', '/api/analytics/hr-dashboard', result);
    result.ok ? passed++ : failed++;

    result = await makeRequest('GET', '/api/analytics/attendance?startDate=2025-01-01&endDate=2025-01-31');
    logTest('Analytics', 'GET', '/api/analytics/attendance', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // ATTENDANCE ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[ATTENDANCE ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/attendance');
    logTest('Attendance', 'GET', '/api/attendance', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // BACKUP ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[BACKUP ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/backups');
    logTest('Backup', 'GET', '/api/backups', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // DEPARTMENT ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[DEPARTMENT ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/departments');
    logTest('Department', 'GET', '/api/departments', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // DOCUMENT ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[DOCUMENT ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/documents');
    logTest('Document', 'GET', '/api/documents', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // DOCUMENT TEMPLATE ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[DOCUMENT TEMPLATE ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/document-templates');
    logTest('Doc Template', 'GET', '/api/document-templates', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // EVENT ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[EVENT ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/events');
    logTest('Event', 'GET', '/api/events', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // HOLIDAY ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[HOLIDAY ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/holidays');
    logTest('Holiday', 'GET', '/api/holidays', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // LEAVE ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[LEAVE ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/leaves');
    logTest('Leave', 'GET', '/api/leaves', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // MIXED VACATION ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[MIXED VACATION ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/mixed-vacations');
    logTest('Mixed Vacation', 'GET', '/api/mixed-vacations', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // NOTIFICATION ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[NOTIFICATION ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/notifications');
    logTest('Notification', 'GET', '/api/notifications', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // PAYROLL ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[PAYROLL ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/payrolls');
    logTest('Payroll', 'GET', '/api/payrolls', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // PERMISSION ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[PERMISSION ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/permissions');
    logTest('Permission', 'GET', '/api/permissions', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // POSITION ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[POSITION ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/positions');
    logTest('Position', 'GET', '/api/positions', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // REPORT ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[REPORT ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/reports');
    logTest('Report', 'GET', '/api/reports', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // REQUEST ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[REQUEST ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/requests');
    logTest('Request', 'GET', '/api/requests', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // RESIGNED EMPLOYEE ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[RESIGNED EMPLOYEE ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/resigned-employees');
    logTest('Resigned Emp', 'GET', '/api/resigned-employees', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // SCHOOL ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[SCHOOL ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/schools');
    logTest('School', 'GET', '/api/schools', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // SECURITY ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[SECURITY ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/security/audit?page=1&limit=10');
    logTest('Security', 'GET', '/api/security/audit', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // SURVEY ROUTES
    // ==========================================
    console.log(`\n${colors.cyan}[SURVEY ROUTES]${colors.reset}`);

    result = await makeRequest('GET', '/api/surveys');
    logTest('Survey', 'GET', '/api/surveys', result);
    result.ok ? passed++ : failed++;

    result = await makeRequest('GET', '/api/surveys/my-surveys');
    logTest('Survey', 'GET', '/api/surveys/my-surveys', result);
    result.ok ? passed++ : failed++;

    // ==========================================
    // SUMMARY
    // ==========================================
    const total = passed + failed;
    const passRate = ((passed / total) * 100).toFixed(2);

    console.log(`\n${colors.blue}========================================`);
    console.log('  TEST SUMMARY');
    console.log(`========================================${colors.reset}`);
    console.log(`Total Tests:    ${total}`);
    console.log(`${colors.green}Passed:         ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed:         ${failed}${colors.reset}`);
    console.log(`Pass Rate:      ${passRate}%`);
    console.log(`${colors.blue}========================================${colors.reset}\n`);

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});
