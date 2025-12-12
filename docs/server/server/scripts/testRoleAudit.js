/**
 * Manual Test Script for Role Audit Logging
 * 
 * This script demonstrates and tests the role audit logging functionality.
 * Run this script to verify that audit logs are being created correctly.
 * 
 * Usage: node server/scripts/testRoleAudit.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SecurityAudit from '../platform/system/models/securityAudit.model.js';
import {
    getRoleAuditLogs,
    getRoleAuditHistory,
    getRoleAuditStats,
    getRecentRoleChanges
} from '../utils/roleAuditQuery.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-sm';

/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ MongoDB connection error:', error);
        process.exit(1);
    }
}

/**
 * Test: Get all role audit logs
 */
async function testGetAllRoleAuditLogs() {
    console.log('\n--- Test: Get All Role Audit Logs ---');
    try {
        const result = await getRoleAuditLogs({ limit: 10 });
        console.log(`✓ Found ${result.total} total audit logs`);
        console.log(`✓ Retrieved ${result.logs.length} logs`);
        
        if (result.logs.length > 0) {
            console.log('\nSample log entry:');
            const sample = result.logs[0];
            console.log(`  Event: ${sample.eventType}`);
            console.log(`  User: ${sample.username || 'N/A'}`);
            console.log(`  Timestamp: ${sample.timestamp}`);
            console.log(`  Role: ${sample.details?.roleName || 'N/A'}`);
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Test: Get role audit statistics
 */
async function testGetRoleAuditStats() {
    console.log('\n--- Test: Get Role Audit Statistics ---');
    try {
        const stats = await getRoleAuditStats(30);
        console.log(`✓ Statistics for: ${stats.period}`);
        
        if (stats.eventStats.length > 0) {
            console.log('\nEvent Statistics:');
            stats.eventStats.forEach(stat => {
                console.log(`  ${stat._id}: ${stat.count} events (${stat.failures} failures)`);
            });
        } else {
            console.log('  No events found in the specified period');
        }
        
        if (stats.activeUsers.length > 0) {
            console.log('\nMost Active Users:');
            stats.activeUsers.slice(0, 5).forEach(user => {
                console.log(`  ${user.username || 'Unknown'}: ${user.actionCount} actions`);
            });
        }
        
        if (stats.modifiedRoles.length > 0) {
            console.log('\nMost Modified Roles:');
            stats.modifiedRoles.slice(0, 5).forEach(role => {
                console.log(`  ${role.roleName || 'Unknown'}: ${role.modificationCount} modifications`);
            });
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Test: Get recent role changes
 */
async function testGetRecentRoleChanges() {
    console.log('\n--- Test: Get Recent Role Changes ---');
    try {
        const changes = await getRecentRoleChanges(5);
        console.log(`✓ Found ${changes.length} recent changes`);
        
        if (changes.length > 0) {
            console.log('\nRecent Changes:');
            changes.forEach((change, index) => {
                console.log(`\n  ${index + 1}. ${change.eventType}`);
                console.log(`     Role: ${change.details?.roleName || 'N/A'}`);
                console.log(`     User: ${change.username || 'N/A'}`);
                console.log(`     Time: ${change.timestamp}`);
                
                if (change.details?.changes) {
                    const { changes: roleChanges } = change.details;
                    if (roleChanges.permissions) {
                        console.log(`     Permissions Added: ${roleChanges.permissions.added?.length || 0}`);
                        console.log(`     Permissions Removed: ${roleChanges.permissions.removed?.length || 0}`);
                    }
                }
            });
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Test: Filter audit logs by event type
 */
async function testFilterByEventType() {
    console.log('\n--- Test: Filter by Event Type ---');
    
    const eventTypes = ['role-created', 'role-updated', 'role-deleted'];
    
    for (const eventType of eventTypes) {
        try {
            const result = await getRoleAuditLogs({ eventType, limit: 5 });
            console.log(`✓ ${eventType}: ${result.total} events found`);
        } catch (error) {
            console.error(`✗ Error for ${eventType}:`, error.message);
        }
    }
}

/**
 * Test: Get audit logs with date range
 */
async function testDateRangeFilter() {
    console.log('\n--- Test: Date Range Filter ---');
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        
        const result = await getRoleAuditLogs({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 100
        });
        
        console.log(`✓ Found ${result.total} audit logs in the last 7 days`);
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Test: Verify audit log structure
 */
async function testAuditLogStructure() {
    console.log('\n--- Test: Audit Log Structure ---');
    try {
        const result = await getRoleAuditLogs({ limit: 1 });
        
        if (result.logs.length === 0) {
            console.log('⚠ No audit logs found to verify structure');
            return;
        }
        
        const log = result.logs[0];
        const requiredFields = [
            'eventType',
            'timestamp',
            'severity',
            'success'
        ];
        
        console.log('Checking required fields:');
        requiredFields.forEach(field => {
            const exists = log[field] !== undefined;
            console.log(`  ${exists ? '✓' : '✗'} ${field}: ${exists ? 'present' : 'missing'}`);
        });
        
        console.log('\nChecking details object:');
        if (log.details) {
            console.log('  ✓ details object exists');
            console.log(`    - roleId: ${log.details.roleId ? 'present' : 'missing'}`);
            console.log(`    - roleName: ${log.details.roleName ? 'present' : 'missing'}`);
        } else {
            console.log('  ✗ details object missing');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Display summary
 */
async function displaySummary() {
    console.log('\n=== Audit Logging Summary ===');
    try {
        const totalLogs = await SecurityAudit.countDocuments({
            eventType: {
                $in: ['role-created', 'role-updated', 'role-deleted', 'role-viewed', 'roles-synced']
            }
        });
        
        console.log(`Total role audit logs: ${totalLogs}`);
        
        if (totalLogs === 0) {
            console.log('\n⚠ No audit logs found. This could mean:');
            console.log('  1. No role operations have been performed yet');
            console.log('  2. The audit logging system needs to be tested with actual operations');
            console.log('\nTo generate audit logs, perform role operations through the API:');
            console.log('  - Create a role: POST /api/roles');
            console.log('  - Update a role: PUT /api/roles/:id');
            console.log('  - Delete a role: DELETE /api/roles/:id');
        } else {
            console.log('✓ Audit logging system is working correctly!');
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
}

/**
 * Main test runner
 */
async function runTests() {
    console.log('=================================');
    console.log('Role Audit Logging Test Suite');
    console.log('=================================');
    
    await connectDB();
    
    await testGetAllRoleAuditLogs();
    await testGetRoleAuditStats();
    await testGetRecentRoleChanges();
    await testFilterByEventType();
    await testDateRangeFilter();
    await testAuditLogStructure();
    await displaySummary();
    
    console.log('\n=================================');
    console.log('Tests Complete');
    console.log('=================================\n');
    
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
