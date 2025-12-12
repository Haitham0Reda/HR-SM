/**
 * Test script for 001_add_tenant_id migration
 * 
 * This script validates that the migration:
 * 1. Adds tenantId to all documents
 * 2. Creates compound indexes correctly
 * 3. Handles edge cases properly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default_tenant';

/**
 * Test collections to validate
 */
const TEST_COLLECTIONS = [
    'users',
    'departments',
    'attendances',
    'requests',
    'vacations',
    'tasks'
];

/**
 * Validation results
 */
const results = {
    passed: [],
    failed: [],
    warnings: []
};

/**
 * Check if all documents have tenantId
 */
async function validateTenantIdField(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Check if collection exists
        const exists = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .hasNext();
            
        if (!exists) {
            results.warnings.push(`Collection '${collectionName}' does not exist`);
            return true;
        }
        
        // Count total documents
        const totalCount = await collection.countDocuments({});
        
        if (totalCount === 0) {
            results.warnings.push(`Collection '${collectionName}' is empty`);
            return true;
        }
        
        // Count documents without tenantId
        const missingCount = await collection.countDocuments({
            tenantId: { $exists: false }
        });
        
        if (missingCount > 0) {
            results.failed.push(
                `Collection '${collectionName}': ${missingCount}/${totalCount} documents missing tenantId`
            );
            return false;
        }
        
        // Count documents with default tenantId
        const defaultCount = await collection.countDocuments({
            tenantId: DEFAULT_TENANT_ID
        });
        
        results.passed.push(
            `Collection '${collectionName}': All ${totalCount} documents have tenantId (${defaultCount} with default)`
        );
        return true;
        
    } catch (error) {
        results.failed.push(`Error validating '${collectionName}': ${error.message}`);
        return false;
    }
}

/**
 * Check if compound indexes exist
 */
async function validateCompoundIndexes(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Check if collection exists
        const exists = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .hasNext();
            
        if (!exists) {
            return true; // Already warned in previous check
        }
        
        // Get all indexes
        const indexes = await collection.indexes();
        
        // Find indexes that include tenantId
        const tenantIndexes = indexes.filter(idx => 
            idx.key && idx.key.tenantId === 1
        );
        
        if (tenantIndexes.length === 0) {
            results.failed.push(
                `Collection '${collectionName}': No compound indexes with tenantId found`
            );
            return false;
        }
        
        results.passed.push(
            `Collection '${collectionName}': Found ${tenantIndexes.length} compound index(es) with tenantId`
        );
        
        // Log index details
        console.log(`\n  Indexes for ${collectionName}:`);
        tenantIndexes.forEach(idx => {
            const fields = Object.keys(idx.key).join(', ');
            const unique = idx.unique ? ' (unique)' : '';
            console.log(`    - ${fields}${unique}`);
        });
        
        return true;
        
    } catch (error) {
        results.failed.push(`Error validating indexes for '${collectionName}': ${error.message}`);
        return false;
    }
}

/**
 * Test query performance with compound indexes
 */
async function testQueryPerformance(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Check if collection exists and has data
        const exists = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .hasNext();
            
        if (!exists) {
            return true;
        }
        
        const count = await collection.countDocuments({});
        if (count === 0) {
            return true;
        }
        
        // Test query with tenantId
        const startTime = Date.now();
        const result = await collection.find({ tenantId: DEFAULT_TENANT_ID })
            .limit(10)
            .explain('executionStats');
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        const usedIndex = result.executionStats?.executionStages?.indexName;
        
        if (usedIndex && usedIndex.includes('tenantId')) {
            results.passed.push(
                `Collection '${collectionName}': Query used index '${usedIndex}' (${executionTime}ms)`
            );
        } else {
            results.warnings.push(
                `Collection '${collectionName}': Query did not use tenantId index (${executionTime}ms)`
            );
        }
        
        return true;
        
    } catch (error) {
        results.warnings.push(`Error testing query for '${collectionName}': ${error.message}`);
        return true; // Don't fail on performance test errors
    }
}

/**
 * Validate unique constraints work correctly
 */
async function validateUniqueConstraints() {
    try {
        const collection = mongoose.connection.collection('users');
        
        // Check if collection exists
        const exists = await mongoose.connection.db
            .listCollections({ name: 'users' })
            .hasNext();
            
        if (!exists) {
            results.warnings.push('Users collection does not exist, skipping unique constraint test');
            return true;
        }
        
        // Get a sample user
        const sampleUser = await collection.findOne({ tenantId: DEFAULT_TENANT_ID });
        
        if (!sampleUser) {
            results.warnings.push('No users found, skipping unique constraint test');
            return true;
        }
        
        // Try to insert duplicate email in same tenant (should fail)
        try {
            await collection.insertOne({
                tenantId: DEFAULT_TENANT_ID,
                email: sampleUser.email,
                username: 'test_duplicate_' + Date.now(),
                password: 'test123'
            });
            
            // If we get here, unique constraint is not working
            results.failed.push('Unique constraint test: Duplicate email was allowed in same tenant');
            
            // Clean up
            await collection.deleteOne({
                username: { $regex: /^test_duplicate_/ }
            });
            
            return false;
            
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error - this is expected and good!
                results.passed.push('Unique constraint test: Correctly prevented duplicate email in same tenant');
                return true;
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        results.failed.push(`Error testing unique constraints: ${error.message}`);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🧪 Testing Migration: 001_add_tenant_id.js');
        console.log('='.repeat(70));
        console.log(`📍 Default Tenant ID: ${DEFAULT_TENANT_ID}`);
        console.log(`📍 Database: ${process.env.MONGODB_URI?.split('@')[1] || 'Unknown'}`);
        console.log('='.repeat(70) + '\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        console.log('Running validation tests...\n');
        
        // Test 1: Validate tenantId field
        console.log('📋 Test 1: Validating tenantId field...');
        for (const collectionName of TEST_COLLECTIONS) {
            await validateTenantIdField(collectionName);
        }
        
        // Test 2: Validate compound indexes
        console.log('\n📋 Test 2: Validating compound indexes...');
        for (const collectionName of TEST_COLLECTIONS) {
            await validateCompoundIndexes(collectionName);
        }
        
        // Test 3: Test query performance
        console.log('\n📋 Test 3: Testing query performance...');
        for (const collectionName of TEST_COLLECTIONS) {
            await testQueryPerformance(collectionName);
        }
        
        // Test 4: Validate unique constraints
        console.log('\n📋 Test 4: Validating unique constraints...');
        await validateUniqueConstraints();
        
        // Print results
        console.log('\n' + '='.repeat(70));
        console.log('📊 Test Results');
        console.log('='.repeat(70));
        
        if (results.passed.length > 0) {
            console.log('\n✅ PASSED TESTS:');
            results.passed.forEach(msg => console.log(`  ✓ ${msg}`));
        }
        
        if (results.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            results.warnings.forEach(msg => console.log(`  ⚠ ${msg}`));
        }
        
        if (results.failed.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            results.failed.forEach(msg => console.log(`  ✗ ${msg}`));
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`Total: ${results.passed.length} passed, ${results.warnings.length} warnings, ${results.failed.length} failed`);
        console.log('='.repeat(70) + '\n');
        
        await mongoose.disconnect();
        console.log('✓ Disconnected from database\n');
        
        // Exit with appropriate code
        process.exit(results.failed.length > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('✗ Test Failed!');
        console.error('='.repeat(70));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(70) + '\n');
        
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run tests
runTests();
