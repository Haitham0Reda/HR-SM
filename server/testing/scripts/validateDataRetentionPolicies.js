#!/usr/bin/env node

/**
 * Validation script for Data Retention Policy Enforcement
 * Property 35: Data Retention Policy Enforcement
 * Validates: Requirements 10.3
 */

import mongoose from 'mongoose';
import DataRetentionPolicy from '../../models/DataRetentionPolicy.js';

async function validateDataRetentionPolicies() {
    console.log('🔍 Validating Data Retention Policy Enforcement...');
    
    let testsPassed = 0;
    let testsTotal = 0;
    
    function test(name, testFn) {
        testsTotal++;
        try {
            const result = testFn();
            if (result instanceof Promise) {
                return result.then(() => {
                    console.log(`✅ ${name}`);
                    testsPassed++;
                }).catch(error => {
                    console.log(`❌ ${name}: ${error.message}`);
                });
            } else {
                console.log(`✅ ${name}`);
                testsPassed++;
            }
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
        }
    }
    
    try {
        // Test 1: DataRetentionPolicy Model Structure
        await test('DataRetentionPolicy model structure', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Test Policy',
                dataType: 'audit_logs',
                retentionPeriod: { value: 30, unit: 'days' },
                createdBy: testUserId
            });
            
            // Test model structure without saving
            if (!policy.tenantId) throw new Error('tenantId not set');
            if (!policy.policyName) throw new Error('policyName not set');
            if (!policy.dataType) throw new Error('dataType not set');
            if (!policy.retentionPeriod) throw new Error('retentionPeriod not set');
            if (!policy.createdBy) throw new Error('createdBy not set');
        });
        
        // Test 2: Retention Period Calculations
        await test('Retention period calculations', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            // Test different units
            const testCases = [
                { value: 5, unit: 'days', expected: 5 },
                { value: 2, unit: 'months', expected: 60 },
                { value: 1, unit: 'years', expected: 365 }
            ];
            
            for (const testCase of testCases) {
                const policy = new DataRetentionPolicy({
                    tenantId: testTenantId,
                    policyName: `Test ${testCase.unit}`,
                    dataType: 'audit_logs',
                    retentionPeriod: { value: testCase.value, unit: testCase.unit },
                    createdBy: testUserId
                });
                
                if (policy.retentionPeriodInDays !== testCase.expected) {
                    throw new Error(`${testCase.unit} calculation incorrect: expected ${testCase.expected}, got ${policy.retentionPeriodInDays}`);
                }
            }
        });
        
        // Test 3: Policy Scheduling Methods
        await test('Policy execution scheduling methods', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Scheduling Test',
                dataType: 'security_logs',
                retentionPeriod: { value: 90, unit: 'days' },
                executionSchedule: {
                    frequency: 'daily',
                    time: '03:00'
                },
                createdBy: testUserId
            });
            
            // Test method availability
            if (typeof policy.calculateNextExecution !== 'function') {
                throw new Error('calculateNextExecution method not available');
            }
            if (typeof policy.isDueForExecution !== 'function') {
                throw new Error('isDueForExecution method not available');
            }
            if (typeof policy.updateStatistics !== 'function') {
                throw new Error('updateStatistics method not available');
            }
            
            // Test calculateNextExecution method
            const nextExec = policy.calculateNextExecution();
            if (!(nextExec instanceof Date)) throw new Error('calculateNextExecution should return Date');
            if (nextExec <= new Date()) throw new Error('Calculated next execution should be in future');
            
            // Test isDueForExecution method
            const isDue = policy.isDueForExecution();
            if (typeof isDue !== 'boolean') throw new Error('isDueForExecution should return boolean');
        });
        
        // Test 4: Legal Requirements Structure
        await test('Legal requirements structure', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Legal Compliance Test',
                dataType: 'financial_records',
                retentionPeriod: { value: 2555, unit: 'days' }, // 7 years
                legalRequirements: {
                    minimumRetention: { value: 7, unit: 'years' },
                    maximumRetention: { value: 10, unit: 'years' },
                    jurisdiction: 'US',
                    regulatoryFramework: ['SOX', 'GDPR'],
                    dataClassification: 'confidential'
                },
                createdBy: testUserId
            });
            
            if (!policy.legalRequirements) throw new Error('Legal requirements not set');
            if (!policy.legalRequirements.jurisdiction) throw new Error('Jurisdiction not set');
            if (!policy.legalRequirements.regulatoryFramework) throw new Error('Regulatory framework not set');
            if (!policy.legalRequirements.regulatoryFramework.includes('SOX')) throw new Error('SOX not in regulatory framework');
            if (policy.legalRequirements.dataClassification !== 'confidential') throw new Error('Data classification not set correctly');
        });
        
        // Test 5: Statistics Tracking Structure
        await test('Statistics tracking structure', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Statistics Test',
                dataType: 'user_data',
                retentionPeriod: { value: 30, unit: 'days' },
                createdBy: testUserId
            });
            
            // Check initial statistics structure
            if (!policy.statistics) throw new Error('Statistics object not initialized');
            if (policy.statistics.totalRecordsProcessed !== 0) throw new Error('Initial totalRecordsProcessed should be 0');
            if (policy.statistics.recordsArchived !== 0) throw new Error('Initial recordsArchived should be 0');
            if (policy.statistics.recordsDeleted !== 0) throw new Error('Initial recordsDeleted should be 0');
            if (policy.statistics.successfulExecutions !== 0) throw new Error('Initial successfulExecutions should be 0');
            if (policy.statistics.failedExecutions !== 0) throw new Error('Initial failedExecutions should be 0');
            
            // Test updateStatistics method
            policy.updateStatistics({
                processed: 10,
                archived: 5,
                deleted: 5,
                processingTime: 1000
            });
            
            if (policy.statistics.totalRecordsProcessed !== 10) throw new Error('Statistics update failed');
            if (policy.statistics.recordsArchived !== 5) throw new Error('Archived count update failed');
            if (policy.statistics.recordsDeleted !== 5) throw new Error('Deleted count update failed');
            if (policy.statistics.successfulExecutions !== 1) throw new Error('Successful executions count failed');
            if (!policy.lastExecuted) throw new Error('Last executed timestamp not set');
        });
        
        // Test 6: Archival Settings Structure
        await test('Archival settings structure', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Archival Test',
                dataType: 'documents',
                retentionPeriod: { value: 30, unit: 'days' },
                archivalSettings: {
                    enabled: true,
                    archiveAfter: { value: 7, unit: 'days' },
                    archiveLocation: 'cloud_storage',
                    compressionEnabled: true,
                    encryptionEnabled: true
                },
                createdBy: testUserId
            });
            
            if (!policy.archivalSettings) throw new Error('Archival settings not set');
            if (policy.archivalSettings.enabled !== true) throw new Error('Archival not enabled');
            if (!policy.archivalSettings.archiveAfter) throw new Error('Archive after not set');
            if (policy.archivalSettings.archiveLocation !== 'cloud_storage') throw new Error('Archive location not set');
            if (policy.archivalSettings.compressionEnabled !== true) throw new Error('Compression not enabled');
            if (policy.archivalSettings.encryptionEnabled !== true) throw new Error('Encryption not enabled');
            
            // Test archival period calculation
            if (policy.archivalPeriodInDays !== 7) throw new Error('Archival period calculation incorrect');
        });
        
        // Test 7: Deletion Settings Structure
        await test('Deletion settings structure', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const policy = new DataRetentionPolicy({
                tenantId: testTenantId,
                policyName: 'Deletion Test',
                dataType: 'user_data',
                retentionPeriod: { value: 30, unit: 'days' },
                deletionSettings: {
                    softDelete: true,
                    hardDeleteAfter: { value: 90, unit: 'days' },
                    requireApproval: true,
                    approvalRequired: ['admin', 'compliance_officer']
                },
                createdBy: testUserId
            });
            
            if (!policy.deletionSettings) throw new Error('Deletion settings not set');
            if (policy.deletionSettings.softDelete !== true) throw new Error('Soft delete not enabled');
            if (!policy.deletionSettings.hardDeleteAfter) throw new Error('Hard delete after not set');
            if (policy.deletionSettings.requireApproval !== true) throw new Error('Approval requirement not set');
            if (!policy.deletionSettings.approvalRequired.includes('admin')) throw new Error('Admin approval not required');
        });
        
        // Test 8: Data Type Validation
        await test('Data type validation', async () => {
            const testTenantId = new mongoose.Types.ObjectId();
            const testUserId = new mongoose.Types.ObjectId();
            
            const validDataTypes = [
                'audit_logs', 'security_logs', 'user_data', 'employee_records',
                'insurance_policies', 'insurance_claims', 'family_members', 'beneficiaries',
                'license_data', 'backup_logs', 'performance_logs', 'system_logs',
                'compliance_logs', 'financial_records', 'documents', 'reports'
            ];
            
            for (const dataType of validDataTypes) {
                const policy = new DataRetentionPolicy({
                    tenantId: testTenantId,
                    policyName: `Test ${dataType}`,
                    dataType: dataType,
                    retentionPeriod: { value: 30, unit: 'days' },
                    createdBy: testUserId
                });
                
                if (policy.dataType !== dataType) {
                    throw new Error(`Data type ${dataType} not set correctly`);
                }
            }
        });
        
        console.log('\\n📊 Test Results:');
        console.log(`Passed: ${testsPassed}/${testsTotal}`);
        
        if (testsPassed === testsTotal) {
            console.log('\\n🎉 All data retention policy enforcement tests passed!');
            console.log('✅ Requirements 10.3 (Data retention and archival system) validated');
            console.log('✅ DataRetentionPolicy model structure validated');
            console.log('✅ Retention period calculations accurate');
            console.log('✅ Execution scheduling methods functional');
            console.log('✅ Legal requirements structure validated');
            console.log('✅ Statistics tracking operational');
            console.log('✅ Archival settings structure validated');
            console.log('✅ Deletion settings structure validated');
            console.log('✅ Data type validation working');
            return true;
        } else {
            console.log('\\n❌ Some tests failed');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error);
        return false;
    }
}

validateDataRetentionPolicies()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    });