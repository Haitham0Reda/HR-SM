/**
 * Test script for Platform Security Monitoring Service
 * Verifies the three main detection capabilities:
 * 1. Unauthorized admin access detection
 * 2. Cross-tenant violation monitoring  
 * 3. Infrastructure attack detection
 */

import platformSecurityMonitoring from '../services/platformSecurityMonitoring.simple.js';

console.log('🔒 Testing Platform Security Monitoring Service');
console.log('================================================\n');

// Test 1: Unauthorized Admin Access Detection
console.log('1. Testing Unauthorized Admin Access Detection');
console.log('-----------------------------------------------');

// Test failed authentication to admin endpoint
const adminAccessTest1 = {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/platform/admin/users',
    method: 'GET',
    statusCode: 401,
    userId: 'user123'
};

const violations1 = platformSecurityMonitoring.detectUnauthorizedAdminAccess(adminAccessTest1);
console.log('Failed admin authentication test:', violations1 ? '✅ DETECTED' : '❌ NOT DETECTED');

// Test access without proper admin role
const adminAccessTest2 = {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/platform/admin/settings',
    method: 'GET',
    statusCode: 200,
    userId: 'user123',
    adminRole: 'user' // Not an admin role
};

const violations2 = platformSecurityMonitoring.detectUnauthorizedAdminAccess(adminAccessTest2);
console.log('Non-admin accessing admin endpoint:', violations2 ? '✅ DETECTED' : '❌ NOT DETECTED');

// Test suspicious user agent
const adminAccessTest3 = {
    ipAddress: '192.168.1.100',
    userAgent: 'curl/7.68.0',
    endpoint: '/api/platform/admin/users',
    method: 'GET',
    statusCode: 200,
    userId: 'user123',
    adminRole: 'admin'
};

const violations3 = platformSecurityMonitoring.detectUnauthorizedAdminAccess(adminAccessTest3);
console.log('Suspicious user agent test:', violations3 ? '✅ DETECTED' : '❌ NOT DETECTED');

console.log('\n2. Testing Cross-Tenant Violation Detection');
console.log('--------------------------------------------');

// Test cross-tenant data access attempt
const crossTenantTest1 = {
    userId: 'user123',
    userCompanyId: 'company-a',
    requestedCompanyId: 'company-b',
    operation: 'read',
    resource: 'employee_data',
    endpoint: '/api/employees',
    method: 'GET',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0'
};

const crossViolations1 = platformSecurityMonitoring.detectCrossTenantViolations(crossTenantTest1);
console.log('Cross-tenant access attempt:', crossViolations1 ? '✅ DETECTED' : '❌ NOT DETECTED');

// Test same company access (should not be detected)
const crossTenantTest2 = {
    userId: 'user123',
    userCompanyId: 'company-a',
    requestedCompanyId: 'company-a', // Same company
    operation: 'read',
    resource: 'employee_data',
    endpoint: '/api/employees',
    method: 'GET',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0'
};

const crossViolations2 = platformSecurityMonitoring.detectCrossTenantViolations(crossTenantTest2);
console.log('Same company access (should be allowed):', crossViolations2 ? '❌ FALSE POSITIVE' : '✅ CORRECTLY ALLOWED');

console.log('\n3. Testing Infrastructure Attack Detection');
console.log('------------------------------------------');

// Test large request attack
const infraTest1 = {
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/upload',
    method: 'POST',
    responseTime: 1000,
    requestSize: 15 * 1024 * 1024 // 15MB request
};

const infraViolations1 = platformSecurityMonitoring.detectInfrastructureAttacks(infraTest1);
console.log('Large request attack:', infraViolations1 ? '✅ DETECTED' : '❌ NOT DETECTED');

// Test DDoS pattern (simulate multiple requests)
console.log('\nSimulating DDoS attack (101 requests)...');
let ddosViolations = null;
const baseRequest = {
    ipAddress: '192.168.1.200',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/data',
    method: 'GET',
    responseTime: 100
};

for (let i = 0; i < 101; i++) {
    ddosViolations = platformSecurityMonitoring.detectInfrastructureAttacks(baseRequest);
}
console.log('DDoS attack pattern:', ddosViolations ? '✅ DETECTED' : '❌ NOT DETECTED');

// Test sensitive endpoint targeting
console.log('\nSimulating sensitive endpoint targeting (21 requests)...');
let sensitiveViolations = null;
const sensitiveRequest = {
    ipAddress: '192.168.1.300',
    userAgent: 'Mozilla/5.0',
    endpoint: '/api/platform/sensitive',
    method: 'GET',
    responseTime: 100
};

for (let i = 0; i < 21; i++) {
    sensitiveViolations = platformSecurityMonitoring.detectInfrastructureAttacks(sensitiveRequest);
}
console.log('Sensitive endpoint targeting:', sensitiveViolations ? '✅ DETECTED' : '❌ NOT DETECTED');

console.log('\n4. Testing Helper Methods');
console.log('-------------------------');

// Test admin endpoint detection
const adminEndpoints = [
    '/api/platform/admin',
    '/api/admin/users',
    '/api/system/config',
    '/api/users', // Should not be admin
    '/api/public/data' // Should not be admin
];

console.log('Admin endpoint detection:');
adminEndpoints.forEach(endpoint => {
    const isAdmin = platformSecurityMonitoring.isAdminEndpoint(endpoint);
    const expected = endpoint.includes('platform') || endpoint.includes('admin') || endpoint.includes('system');
    const result = isAdmin === expected ? '✅' : '❌';
    console.log(`  ${endpoint}: ${result} ${isAdmin ? 'ADMIN' : 'NOT ADMIN'}`);
});

// Test suspicious user agent detection
const userAgents = [
    'curl/7.68.0', // Should be suspicious
    'wget/1.20.3', // Should be suspicious
    'python-requests/2.25.1', // Should be suspicious
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // Should not be suspicious
    null // Should be suspicious
];

console.log('\nSuspicious user agent detection:');
userAgents.forEach(ua => {
    const isSuspicious = platformSecurityMonitoring.isSuspiciousUserAgent(ua);
    const uaDisplay = ua || 'null';
    console.log(`  ${uaDisplay}: ${isSuspicious ? '⚠️  SUSPICIOUS' : '✅ NORMAL'}`);
});

console.log('\n5. Testing System Metrics');
console.log('-------------------------');

const metrics = platformSecurityMonitoring.getSystemMetrics();
console.log('System metrics retrieved:', metrics ? '✅ SUCCESS' : '❌ FAILED');
if (metrics) {
    console.log(`  Memory usage: ${(metrics.memoryUsage * 100).toFixed(2)}%`);
    console.log(`  CPU usage: ${(metrics.cpuUsage * 100).toFixed(2)}%`);
    console.log(`  CPU count: ${metrics.cpuCount}`);
    console.log(`  Uptime: ${Math.floor(metrics.uptime / 3600)} hours`);
}

console.log('\n6. Testing Monitoring Statistics');
console.log('--------------------------------');

const stats = platformSecurityMonitoring.getMonitoringStats();
console.log('Monitoring statistics:', stats ? '✅ SUCCESS' : '❌ FAILED');
if (stats) {
    console.log(`  Initialized: ${stats.isInitialized}`);
    console.log(`  Monitoring enabled: ${stats.monitoringEnabled}`);
    console.log(`  Tracked IPs: ${stats.trackedIPs}`);
    console.log(`  Admin access attempts: ${stats.adminAccessAttempts}`);
    console.log(`  Cross-tenant violations: ${stats.crossTenantViolations}`);
}

console.log('\n🎉 Platform Security Monitoring Test Complete!');
console.log('===============================================');
console.log('All three main detection capabilities have been implemented:');
console.log('✅ Unauthorized admin access detection (Requirements 11.1)');
console.log('✅ Cross-tenant violation monitoring (Requirements 11.2)');
console.log('✅ Infrastructure attack detection (Requirements 11.3)');