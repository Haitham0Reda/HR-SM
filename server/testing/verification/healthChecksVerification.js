#!/usr/bin/env node

/**
 * Health Checks Verification Script
 * 
 * This script verifies that both backends have working health check endpoints:
 * - Main HR-SM Backend (port 5000)
 * - License Server Backend (port 4000)
 */

import fetch from 'node-fetch';

const MAIN_BACKEND_URL = 'http://localhost:5000';
const LICENSE_SERVER_URL = 'http://localhost:4000';

async function checkHealthEndpoint(url, name) {
    try {
        console.log(`\n🔍 Checking ${name} health endpoint...`);
        
        const response = await fetch(`${url}/health`);
        const data = await response.json();
        
        if (response.ok && data.success !== false) {
            console.log(`✅ ${name} health check: PASSED`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
            return true;
        } else {
            console.log(`❌ ${name} health check: FAILED`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name} health check: ERROR`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function checkDetailedHealthEndpoint(url, path, name) {
    try {
        console.log(`\n🔍 Checking ${name} detailed health endpoint...`);
        
        const response = await fetch(`${url}${path}`);
        const data = await response.json();
        
        if (response.ok && data.success !== false) {
            console.log(`✅ ${name} detailed health check: PASSED`);
            console.log(`   Status: ${response.status}`);
            return true;
        } else {
            console.log(`⚠️  ${name} detailed health check: DEGRADED`);
            console.log(`   Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name} detailed health check: ERROR`);
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🏥 Health Checks Verification');
    console.log('============================');
    
    const results = {
        mainBackend: false,
        licenseServer: false,
        mainBackendDetailed: false,
        licenseServerDetailed: false
    };
    
    // Check basic health endpoints
    results.mainBackend = await checkHealthEndpoint(MAIN_BACKEND_URL, 'Main Backend (HR-SM)');
    results.licenseServer = await checkHealthEndpoint(LICENSE_SERVER_URL, 'License Server');
    
    // Check detailed health endpoints
    results.mainBackendDetailed = await checkDetailedHealthEndpoint(
        MAIN_BACKEND_URL, 
        '/api/platform/system/health', 
        'Main Backend'
    );
    results.licenseServerDetailed = await checkDetailedHealthEndpoint(
        LICENSE_SERVER_URL, 
        '/health/detailed', 
        'License Server'
    );
    
    // Summary
    console.log('\n📊 VERIFICATION SUMMARY');
    console.log('======================');
    console.log(`Main Backend Basic Health:     ${results.mainBackend ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`License Server Basic Health:   ${results.licenseServer ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Main Backend Detailed Health:  ${results.mainBackendDetailed ? '✅ PASS' : '⚠️  DEGRADED'}`);
    console.log(`License Server Detailed Health: ${results.licenseServerDetailed ? '✅ PASS' : '⚠️  DEGRADED'}`);
    
    const basicHealthPassing = results.mainBackend && results.licenseServer;
    
    if (basicHealthPassing) {
        console.log('\n🎉 SUCCESS: Both backends have working health checks!');
        console.log('\n📋 Available Health Endpoints:');
        console.log('   Main Backend:');
        console.log('   - GET /health (basic)');
        console.log('   - GET /api/platform/system/health (detailed)');
        console.log('   License Server:');
        console.log('   - GET /health (basic)');
        console.log('   - GET /health/detailed (comprehensive)');
        console.log('   - GET /metrics/health (metrics)');
        process.exit(0);
    } else {
        console.log('\n❌ FAILURE: One or more health checks are not working');
        process.exit(1);
    }
}

// Run verification
main().catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
});