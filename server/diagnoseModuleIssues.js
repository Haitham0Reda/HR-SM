#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api/v1';

async function diagnoseAllEndpoints() {
    try {
        console.log('🔍 Comprehensive endpoint diagnosis...\n');

        // Test login
        console.log('1. Testing login...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: 'techcorp_solutions'
        });

        if (!loginResponse.data.success) {
            console.log('❌ Login failed');
            return;
        }

        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('✅ Login successful');

        // Comprehensive endpoint list to test
        const endpoints = [
            // Core HR endpoints
            { name: 'Current User', url: '/auth/me', method: 'GET' },
            { name: 'User Profile', url: '/users/profile', method: 'GET' },
            { name: 'All Users', url: '/users', method: 'GET' },
            { name: 'Departments', url: '/departments', method: 'GET' },
            { name: 'Positions', url: '/positions', method: 'GET' },
            
            // Dashboard & Analytics
            { name: 'Dashboard Data', url: '/dashboard', method: 'GET' },
            { name: 'Dashboard Config', url: '/dashboard/config', method: 'GET' },
            { name: 'Dashboard Statistics', url: '/dashboard/statistics', method: 'GET' },
            { name: 'Analytics', url: '/analytics', method: 'GET' },
            
            // Attendance
            { name: 'Today Attendance', url: '/attendance/today', method: 'GET' },
            { name: 'All Attendance', url: '/attendance', method: 'GET' },
            { name: 'Attendance Devices', url: '/attendance-devices', method: 'GET' },
            
            // Notifications & Communication
            { name: 'Notifications', url: '/notifications', method: 'GET' },
            { name: 'Announcements', url: '/announcements', method: 'GET' },
            
            // Documents
            { name: 'Documents', url: '/documents', method: 'GET' },
            { name: 'Document Templates', url: '/document-templates', method: 'GET' },
            { name: 'Hardcopies', url: '/hardcopies', method: 'GET' },
            
            // Tasks
            { name: 'Tasks', url: '/tasks', method: 'GET' },
            { name: 'Task Reports', url: '/task-reports', method: 'GET' },
            
            // Payroll
            { name: 'Payroll', url: '/payroll', method: 'GET' },
            
            // Reports
            { name: 'Reports', url: '/reports', method: 'GET' },
            
            // Requests & Leaves
            { name: 'Requests', url: '/requests', method: 'GET' },
            { name: 'Vacations', url: '/vacations', method: 'GET' },
            { name: 'Sick Leaves', url: '/sick-leaves', method: 'GET' },
            { name: 'Permission Requests', url: '/permission-requests', method: 'GET' },
            { name: 'Forget Checks', url: '/forget-checks', method: 'GET' },
            { name: 'Missions', url: '/missions', method: 'GET' },
            
            // Holidays & Events
            { name: 'Holidays', url: '/holidays', method: 'GET' },
            { name: 'Events', url: '/events', method: 'GET' },
            
            // System & Configuration
            { name: 'Module Availability', url: '/modules/availability', method: 'GET' },
            { name: 'Licenses', url: '/licenses', method: 'GET' },
            { name: 'Theme', url: '/theme', method: 'GET' },
            { name: 'Feature Flags', url: '/feature-flags', method: 'GET' },
            
            // Surveys
            { name: 'Surveys', url: '/surveys', method: 'GET' },
            
            // Life Insurance (optional module)
            { name: 'Life Insurance', url: '/life-insurance', method: 'GET' },
            
            // Metrics & Monitoring
            { name: 'Metrics', url: '/metrics', method: 'GET' },
            { name: 'Logs', url: '/logs', method: 'GET' }
        ];

        console.log('\n2. Testing all endpoints...');
        
        const results = {
            working: [],
            moduleIssues: [],
            authIssues: [],
            notFound: [],
            serverErrors: [],
            other: []
        };

        for (const endpoint of endpoints) {
            try {
                let response;
                if (endpoint.method === 'GET') {
                    response = await axios.get(`${API_BASE}${endpoint.url}`, { headers });
                } else if (endpoint.method === 'POST') {
                    response = await axios.post(`${API_BASE}${endpoint.url}`, endpoint.data || {}, { headers });
                }

                if (response.status === 200 || response.status === 201) {
                    results.working.push({
                        name: endpoint.name,
                        url: endpoint.url,
                        status: response.status,
                        success: response.data.success
                    });
                    console.log(`✅ ${endpoint.name}: ${response.status} - Success`);
                } else {
                    results.other.push({
                        name: endpoint.name,
                        url: endpoint.url,
                        status: response.status,
                        message: response.data.message
                    });
                    console.log(`⚠️  ${endpoint.name}: ${response.status} - ${response.data.message || 'Unknown'}`);
                }
                
            } catch (error) {
                if (error.response) {
                    const status = error.response.status;
                    const message = error.response.data.message || error.response.data.error || 'Unknown error';
                    
                    if (status === 403 && (message.includes('MODULE') || message.includes('LICENSE') || message.includes('license') || message.includes('module'))) {
                        results.moduleIssues.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            status,
                            message,
                            details: error.response.data
                        });
                        console.log(`🔧 ${endpoint.name}: ${status} - MODULE ISSUE: ${message}`);
                    } else if (status === 401 || status === 403) {
                        results.authIssues.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            status,
                            message
                        });
                        console.log(`🔐 ${endpoint.name}: ${status} - AUTH ISSUE: ${message}`);
                    } else if (status === 404) {
                        results.notFound.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            status,
                            message
                        });
                        console.log(`❌ ${endpoint.name}: ${status} - NOT FOUND: ${message}`);
                    } else if (status >= 500) {
                        results.serverErrors.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            status,
                            message
                        });
                        console.log(`💥 ${endpoint.name}: ${status} - SERVER ERROR: ${message}`);
                    } else {
                        results.other.push({
                            name: endpoint.name,
                            url: endpoint.url,
                            status,
                            message
                        });
                        console.log(`⚠️  ${endpoint.name}: ${status} - ${message}`);
                    }
                } else {
                    results.serverErrors.push({
                        name: endpoint.name,
                        url: endpoint.url,
                        status: 'Network Error',
                        message: error.message
                    });
                    console.log(`💥 ${endpoint.name}: Network Error - ${error.message}`);
                }
            }
        }

        // Summary report
        console.log('\n' + '='.repeat(80));
        console.log('📊 COMPREHENSIVE DIAGNOSIS REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n✅ WORKING ENDPOINTS (${results.working.length}):`);
        results.working.forEach(item => {
            console.log(`   • ${item.name} (${item.url})`);
        });
        
        if (results.moduleIssues.length > 0) {
            console.log(`\n🔧 MODULE CONFIGURATION ISSUES (${results.moduleIssues.length}):`);
            results.moduleIssues.forEach(item => {
                console.log(`   • ${item.name} (${item.url}) - ${item.message}`);
                if (item.details.licensedFeatures) {
                    console.log(`     Available features: ${item.details.licensedFeatures.join(', ')}`);
                }
            });
        }
        
        if (results.authIssues.length > 0) {
            console.log(`\n🔐 AUTHENTICATION ISSUES (${results.authIssues.length}):`);
            results.authIssues.forEach(item => {
                console.log(`   • ${item.name} (${item.url}) - ${item.message}`);
            });
        }
        
        if (results.notFound.length > 0) {
            console.log(`\n❌ NOT FOUND / NOT IMPLEMENTED (${results.notFound.length}):`);
            results.notFound.forEach(item => {
                console.log(`   • ${item.name} (${item.url}) - ${item.message}`);
            });
        }
        
        if (results.serverErrors.length > 0) {
            console.log(`\n💥 SERVER ERRORS (${results.serverErrors.length}):`);
            results.serverErrors.forEach(item => {
                console.log(`   • ${item.name} (${item.url}) - ${item.message}`);
            });
        }
        
        if (results.other.length > 0) {
            console.log(`\n⚠️  OTHER ISSUES (${results.other.length}):`);
            results.other.forEach(item => {
                console.log(`   • ${item.name} (${item.url}) - ${item.message}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎯 PRIORITY FIXES NEEDED:');
        console.log('='.repeat(80));
        
        if (results.moduleIssues.length > 0) {
            console.log('\n🔧 MODULE ISSUES TO FIX:');
            results.moduleIssues.forEach(item => {
                console.log(`   1. Fix ${item.name}: ${item.message}`);
            });
        }
        
        if (results.serverErrors.length > 0) {
            console.log('\n💥 SERVER ERRORS TO FIX:');
            results.serverErrors.forEach(item => {
                console.log(`   2. Fix ${item.name}: ${item.message}`);
            });
        }
        
        if (results.notFound.length > 0) {
            console.log('\n❌ MISSING IMPLEMENTATIONS:');
            results.notFound.forEach(item => {
                console.log(`   3. Implement ${item.name}: ${item.url}`);
            });
        }

        console.log(`\n📈 OVERALL STATUS:`);
        console.log(`   • Working: ${results.working.length}/${endpoints.length} (${Math.round(results.working.length/endpoints.length*100)}%)`);
        console.log(`   • Module Issues: ${results.moduleIssues.length}`);
        console.log(`   • Auth Issues: ${results.authIssues.length}`);
        console.log(`   • Not Found: ${results.notFound.length}`);
        console.log(`   • Server Errors: ${results.serverErrors.length}`);

    } catch (error) {
        if (error.response) {
            console.log(`❌ Diagnosis failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`❌ Diagnosis failed: ${error.message}`);
        }
    }
}

diagnoseAllEndpoints();