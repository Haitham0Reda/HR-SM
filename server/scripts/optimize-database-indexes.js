#!/usr/bin/env node

/**
 * Database Index Optimization Script
 * 
 * This script creates and verifies proper indexes for both the main HRMS database
 * and the license server database to ensure optimal query performance.
 * 
 * Task: 15.4 - Optimize MongoDB database performance
 * Requirement: Both databases have proper indexes
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

console.log('🔧 Database Index Optimization');
console.log('===============================\n');

/**
 * Main HRMS Database Indexes
 * These indexes support the main application queries
 */
const MAIN_DB_INDEXES = {
  // Tenant model indexes (Platform Administration)
  tenants: [
    { keys: { tenantId: 1 }, options: { unique: true, name: 'tenantId_unique' } },
    { keys: { domain: 1 }, options: { unique: true, sparse: true, name: 'domain_unique' } },
    { keys: { status: 1 }, options: { name: 'status_index' } },
    { keys: { 'subscription.status': 1 }, options: { name: 'subscription_status_index' } },
    { keys: { 'subscription.expiresAt': 1 }, options: { name: 'subscription_expires_index' } },
    { keys: { 'license.licenseNumber': 1 }, options: { sparse: true, name: 'license_number_index' } },
    { keys: { 'license.expiresAt': 1 }, options: { name: 'license_expires_index' } },
    { keys: { 'license.licenseStatus': 1 }, options: { name: 'license_status_index' } },
    { keys: { 'billing.currentPlan': 1 }, options: { name: 'billing_plan_index' } },
    { keys: { 'billing.paymentStatus': 1 }, options: { name: 'billing_payment_status_index' } },
    { keys: { 'usage.lastActivityAt': 1 }, options: { name: 'usage_activity_index' } },
    { keys: { 'compliance.dataResidency': 1 }, options: { name: 'compliance_residency_index' } },
    { keys: { createdAt: 1 }, options: { name: 'created_at_index' } },
    { keys: { updatedAt: 1 }, options: { name: 'updated_at_index' } },
    // Compound indexes for analytics
    { keys: { status: 1, 'billing.currentPlan': 1 }, options: { name: 'status_plan_compound' } },
    { keys: { 'license.licenseType': 1, 'license.expiresAt': 1 }, options: { name: 'license_type_expires_compound' } },
    { keys: { 'license.licenseStatus': 1, 'license.expiresAt': 1 }, options: { name: 'license_status_expires_compound' } },
    { keys: { 'billing.paymentStatus': 1, 'billing.nextBillingDate': 1 }, options: { name: 'billing_status_date_compound' } }
  ],

  // User model indexes (HR Core)
  users: [
    { keys: { email: 1, tenantId: 1 }, options: { unique: true, name: 'email_tenant_unique' } },
    { keys: { employeeId: 1, tenantId: 1 }, options: { unique: true, sparse: true, name: 'employee_tenant_unique' } },
    { keys: { tenantId: 1 }, options: { name: 'tenant_index' } },
    { keys: { status: 1 }, options: { name: 'status_index' } },
    { keys: { role: 1 }, options: { name: 'role_index' } },
    { keys: { department: 1 }, options: { name: 'department_index' } },
    { keys: { manager: 1 }, options: { name: 'manager_index' } },
    { keys: { hireDate: 1 }, options: { name: 'hire_date_index' } },
    // Compound indexes for common queries
    { keys: { tenantId: 1, status: 1 }, options: { name: 'tenant_status_compound' } },
    { keys: { tenantId: 1, department: 1 }, options: { name: 'tenant_department_compound' } },
    { keys: { tenantId: 1, role: 1 }, options: { name: 'tenant_role_compound' } }
  ],

  // Audit log indexes (Enhanced Audit Logging)
  auditlogs: [
    { keys: { tenantId: 1 }, options: { name: 'tenant_index' } },
    { keys: { createdAt: -1 }, options: { name: 'created_at_desc_index' } },
    { keys: { userId: 1, createdAt: -1 }, options: { name: 'user_created_compound' } },
    { keys: { resource: 1, resourceId: 1 }, options: { name: 'resource_compound' } },
    { keys: { action: 1, createdAt: -1 }, options: { name: 'action_created_compound' } },
    { keys: { category: 1, severity: 1 }, options: { name: 'category_severity_compound' } },
    { keys: { 'licenseInfo.licenseNumber': 1 }, options: { sparse: true, name: 'license_number_index' } },
    { keys: { 'licenseInfo.tenantId': 1 }, options: { sparse: true, name: 'license_tenant_index' } },
    { keys: { correlationId: 1 }, options: { sparse: true, name: 'correlation_id_index' } },
    { keys: { requestId: 1 }, options: { sparse: true, name: 'request_id_index' } },
    { keys: { status: 1, severity: 1 }, options: { name: 'status_severity_compound' } },
    { keys: { tags: 1 }, options: { name: 'tags_index' } },
    // Compound indexes for audit queries
    { keys: { tenantId: 1, action: 1, createdAt: -1 }, options: { name: 'tenant_action_created_compound' } },
    { keys: { tenantId: 1, userId: 1, createdAt: -1 }, options: { name: 'tenant_user_created_compound' } }
  ],

  // Life Insurance Policy indexes
  insurancepolicies: [
    { keys: { tenantId: 1 }, options: { name: 'tenant_index' } },
    { keys: { policyNumber: 1 }, options: { unique: true, name: 'policy_number_unique' } },
    { keys: { employeeId: 1 }, options: { name: 'employee_index' } },
    { keys: { employeeNumber: 1 }, options: { name: 'employee_number_index' } },
    { keys: { policyType: 1 }, options: { name: 'policy_type_index' } },
    { keys: { startDate: 1 }, options: { name: 'start_date_index' } },
    { keys: { endDate: 1 }, options: { name: 'end_date_index' } },
    { keys: { status: 1 }, options: { name: 'status_index' } },
    // Compound indexes for life insurance queries
    { keys: { tenantId: 1, employeeId: 1 }, options: { name: 'tenant_employee_compound' } },
    { keys: { tenantId: 1, policyType: 1, status: 1 }, options: { name: 'tenant_type_status_compound' } },
    { keys: { tenantId: 1, startDate: 1, endDate: 1 }, options: { name: 'tenant_date_range_compound' } },
    { keys: { tenantId: 1, status: 1, endDate: 1 }, options: { name: 'tenant_status_expires_compound' } }
  ],

  // Family Member indexes
  familymembers: [
    { keys: { tenantId: 1 }, options: { name: 'tenant_index' } },
    { keys: { insuranceNumber: 1 }, options: { unique: true, name: 'insurance_number_unique' } },
    { keys: { employeeId: 1 }, options: { name: 'employee_index' } },
    { keys: { policyId: 1 }, options: { name: 'policy_index' } },
    { keys: { dateOfBirth: 1 }, options: { name: 'birth_date_index' } },
    { keys: { relationship: 1 }, options: { name: 'relationship_index' } },
    { keys: { status: 1 }, options: { name: 'status_index' } },
    // Compound indexes for family member queries
    { keys: { tenantId: 1, employeeId: 1 }, options: { name: 'tenant_employee_compound' } },
    { keys: { tenantId: 1, policyId: 1 }, options: { name: 'tenant_policy_compound' } },
    { keys: { tenantId: 1, relationship: 1, status: 1 }, options: { name: 'tenant_relationship_status_compound' } }
  ],

  // Insurance Claim indexes
  insuranceclaims: [
    { keys: { tenantId: 1 }, options: { name: 'tenant_index' } },
    { keys: { claimNumber: 1 }, options: { unique: true, name: 'claim_number_unique' } },
    { keys: { policyId: 1 }, options: { name: 'policy_index' } },
    { keys: { employeeId: 1 }, options: { name: 'employee_index' } },
    { keys: { claimType: 1 }, options: { name: 'claim_type_index' } },
    { keys: { incidentDate: 1 }, options: { name: 'incident_date_index' } },
    { keys: { status: 1 }, options: { name: 'status_index' } },
    { keys: { priority: 1 }, options: { name: 'priority_index' } },
    // Compound indexes for claim queries
    { keys: { tenantId: 1, employeeId: 1, status: 1 }, options: { name: 'tenant_employee_status_compound' } },
    { keys: { tenantId: 1, policyId: 1, status: 1 }, options: { name: 'tenant_policy_status_compound' } },
    { keys: { tenantId: 1, claimType: 1, status: 1 }, options: { name: 'tenant_type_status_compound' } },
    { keys: { tenantId: 1, incidentDate: 1 }, options: { name: 'tenant_incident_date_compound' } },
    { keys: { tenantId: 1, status: 1, priority: 1 }, options: { name: 'tenant_status_priority_compound' } }
  ]
};

/**
 * License Server Database Indexes
 * These indexes support license validation and management queries
 */
const LICENSE_DB_INDEXES = {
  // License model indexes
  licenses: [
    { keys: { licenseNumber: 1 }, options: { unique: true, sparse: true, name: 'license_number_unique' } },
    { keys: { tenantId: 1 }, options: { name: 'tenantId_1' } }, // Use existing name
    { keys: { status: 1 }, options: { name: 'status_1' } }, // Use existing name
    { keys: { expiresAt: 1 }, options: { name: 'expiresAt_1' } }, // Use existing name
    { keys: { type: 1 }, options: { name: 'type_1' } }, // Use existing name
    { keys: { createdAt: -1 }, options: { name: 'created_at_desc_index' } },
    { keys: { 'activations.machineId': 1 }, options: { name: 'activations.machineId_1' } }, // Use existing name
    { keys: { 'usage.lastValidatedAt': 1 }, options: { name: 'last_validated_index' } },
    // Compound indexes for license server queries
    { keys: { tenantId: 1, status: 1 }, options: { name: 'tenant_status_compound' } },
    { keys: { status: 1, expiresAt: 1 }, options: { name: 'status_expires_compound' } },
    { keys: { type: 1, status: 1 }, options: { name: 'type_status_compound' } },
    { keys: { tenantId: 1, type: 1 }, options: { name: 'tenant_type_compound' } }
  ]
};

/**
 * Connect to a MongoDB database
 */
async function connectToDatabase(uri, dbName) {
  try {
    const connection = mongoose.createConnection(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    await connection.asPromise();
    console.log(`✅ Connected to ${dbName} database`);
    return connection;
  } catch (error) {
    console.error(`❌ Failed to connect to ${dbName} database:`, error.message);
    throw error;
  }
}

/**
 * Create indexes for a collection
 */
async function createIndexesForCollection(db, collectionName, indexes) {
  try {
    const collection = db.collection(collectionName);
    
    console.log(`\n📋 Processing collection: ${collectionName}`);
    
    // Check if collection exists, if not create it
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`   📝 Collection '${collectionName}' does not exist, creating it...`);
      // Create collection by inserting and removing a dummy document
      await collection.insertOne({ _temp: true });
      await collection.deleteOne({ _temp: true });
      console.log(`   ✅ Collection '${collectionName}' created`);
    }
    
    // Get existing indexes
    const existingIndexes = await collection.listIndexes().toArray();
    const existingIndexNames = existingIndexes.map(idx => idx.name);
    
    console.log(`   Current indexes: ${existingIndexNames.length}`);
    
    let created = 0;
    let skipped = 0;
    
    for (const indexSpec of indexes) {
      const indexName = indexSpec.options.name;
      
      if (existingIndexNames.includes(indexName)) {
        console.log(`   ⏭️  Skipped: ${indexName} (already exists)`);
        skipped++;
      } else {
        try {
          await collection.createIndex(indexSpec.keys, indexSpec.options);
          console.log(`   ✅ Created: ${indexName}`);
          created++;
        } catch (error) {
          console.log(`   ❌ Failed to create ${indexName}: ${error.message}`);
        }
      }
    }
    
    console.log(`   📊 Summary: ${created} created, ${skipped} skipped`);
    return { created, skipped };
    
  } catch (error) {
    console.error(`❌ Error processing collection ${collectionName}:`, error.message);
    return { created: 0, skipped: 0, error: error.message };
  }
}

/**
 * Optimize indexes for a database
 */
async function optimizeDatabase(connection, dbName, indexSpecs) {
  console.log(`\n🔧 Optimizing ${dbName} Database Indexes`);
  console.log('='.repeat(50));
  
  const db = connection.db;
  let totalCreated = 0;
  let totalSkipped = 0;
  const results = {};
  
  for (const [collectionName, indexes] of Object.entries(indexSpecs)) {
    const result = await createIndexesForCollection(db, collectionName, indexes);
    results[collectionName] = result;
    totalCreated += result.created || 0;
    totalSkipped += result.skipped || 0;
  }
  
  console.log(`\n📊 ${dbName} Database Summary:`);
  console.log(`   Total indexes created: ${totalCreated}`);
  console.log(`   Total indexes skipped: ${totalSkipped}`);
  
  return { totalCreated, totalSkipped, results };
}

/**
 * Verify database performance with sample queries
 */
async function verifyPerformance(connection, dbName) {
  console.log(`\n🔍 Verifying ${dbName} Database Performance`);
  console.log('='.repeat(40));
  
  const db = connection.db;
  
  try {
    // Test query performance on key collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`   Collections found: ${collectionNames.length}`);
    
    // Sample performance tests
    const performanceTests = [];
    
    if (collectionNames.includes('tenants')) {
      const start = Date.now();
      await db.collection('tenants').findOne({ status: 'active' });
      const duration = Date.now() - start;
      performanceTests.push({ collection: 'tenants', query: 'status lookup', duration });
    }
    
    if (collectionNames.includes('users')) {
      const start = Date.now();
      await db.collection('users').findOne({ status: 'active' });
      const duration = Date.now() - start;
      performanceTests.push({ collection: 'users', query: 'status lookup', duration });
    }
    
    if (collectionNames.includes('licenses')) {
      const start = Date.now();
      await db.collection('licenses').findOne({ status: 'active' });
      const duration = Date.now() - start;
      performanceTests.push({ collection: 'licenses', query: 'status lookup', duration });
    }
    
    console.log('   Performance test results:');
    performanceTests.forEach(test => {
      const status = test.duration < 50 ? '✅' : test.duration < 100 ? '⚠️' : '❌';
      console.log(`   ${status} ${test.collection}.${test.query}: ${test.duration}ms`);
    });
    
    return performanceTests;
    
  } catch (error) {
    console.error(`   ❌ Performance verification failed: ${error.message}`);
    return [];
  }
}

/**
 * Generate index statistics
 */
async function generateIndexStats(connection, dbName) {
  console.log(`\n📈 ${dbName} Database Index Statistics`);
  console.log('='.repeat(40));
  
  const db = connection.db;
  
  try {
    const collections = await db.listCollections().toArray();
    let totalIndexes = 0;
    let totalSize = 0;
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const coll = db.collection(collectionName);
      
      try {
        const indexes = await coll.listIndexes().toArray();
        const stats = await coll.stats();
        
        console.log(`   ${collectionName}: ${indexes.length} indexes`);
        totalIndexes += indexes.length;
        
        if (stats.totalIndexSize) {
          totalSize += stats.totalIndexSize;
        }
      } catch (error) {
        // Collection might be empty or have issues, skip
        console.log(`   ${collectionName}: Unable to get stats`);
      }
    }
    
    console.log(`\n   Total indexes: ${totalIndexes}`);
    if (totalSize > 0) {
      console.log(`   Total index size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    return { totalIndexes, totalSize };
    
  } catch (error) {
    console.error(`   ❌ Stats generation failed: ${error.message}`);
    return { totalIndexes: 0, totalSize: 0 };
  }
}

/**
 * Main optimization function
 */
async function optimizeDatabaseIndexes() {
  console.log('🚀 Starting database optimization...');
  
  let mainConnection = null;
  let licenseConnection = null;
  
  try {
    console.log('📋 Step 1: Connecting to databases...');
    
    // 1. Connect to main HRMS database
    const mainDbUri = process.env.MONGODB_URI;
    if (!mainDbUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('🔗 Connecting to main database...');
    mainConnection = await connectToDatabase(mainDbUri, 'Main HRMS');
    
    // 2. Connect to license server database
    const licenseDbUri = process.env.LICENSE_DB_URI || mainDbUri.replace('/hrms', '/hrsm-licenses');
    console.log('🔗 Connecting to license database...');
    licenseConnection = await connectToDatabase(licenseDbUri, 'License Server');
    
    console.log('📋 Step 2: Optimizing main database...');
    // 3. Optimize main database indexes
    const mainResults = await optimizeDatabase(mainConnection, 'Main HRMS', MAIN_DB_INDEXES);
    
    console.log('📋 Step 3: Optimizing license database...');
    // 4. Optimize license database indexes
    const licenseResults = await optimizeDatabase(licenseConnection, 'License Server', LICENSE_DB_INDEXES);
    
    console.log('📋 Step 4: Verifying performance...');
    // 5. Verify performance
    await verifyPerformance(mainConnection, 'Main HRMS');
    await verifyPerformance(licenseConnection, 'License Server');
    
    console.log('📋 Step 5: Generating statistics...');
    // 6. Generate statistics
    const mainStats = await generateIndexStats(mainConnection, 'Main HRMS');
    const licenseStats = await generateIndexStats(licenseConnection, 'License Server');
    
    // 7. Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE INDEX OPTIMIZATION COMPLETE');
    console.log('='.repeat(60));
    
    console.log('\n📊 Overall Summary:');
    console.log(`   Main HRMS Database:`);
    console.log(`     - Indexes created: ${mainResults.totalCreated}`);
    console.log(`     - Indexes skipped: ${mainResults.totalSkipped}`);
    console.log(`     - Total indexes: ${mainStats.totalIndexes}`);
    
    console.log(`   License Server Database:`);
    console.log(`     - Indexes created: ${licenseResults.totalCreated}`);
    console.log(`     - Indexes skipped: ${licenseResults.totalSkipped}`);
    console.log(`     - Total indexes: ${licenseStats.totalIndexes}`);
    
    const grandTotalCreated = mainResults.totalCreated + licenseResults.totalCreated;
    const grandTotalSkipped = mainResults.totalSkipped + licenseResults.totalSkipped;
    
    console.log(`\n🎯 Grand Total:`);
    console.log(`   - New indexes created: ${grandTotalCreated}`);
    console.log(`   - Existing indexes: ${grandTotalSkipped}`);
    console.log(`   - Total indexes: ${mainStats.totalIndexes + licenseStats.totalIndexes}`);
    
    if (grandTotalCreated > 0) {
      console.log('\n✅ Database indexes have been optimized successfully!');
      console.log('   Query performance should be significantly improved.');
    } else {
      console.log('\n✅ All required indexes were already present.');
      console.log('   Database performance is already optimized.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Monitor query performance in production');
    console.log('   2. Use MongoDB Compass or explain() to verify index usage');
    console.log('   3. Consider adding more indexes based on actual query patterns');
    console.log('   4. Regularly review and optimize indexes as the application grows');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Database optimization failed:', error.message);
    console.error('\nPlease check:');
    console.error('   1. MongoDB connection strings are correct');
    console.error('   2. Database servers are running and accessible');
    console.error('   3. User has sufficient permissions to create indexes');
    
    return false;
    
  } finally {
    // Close connections
    if (mainConnection) {
      await mainConnection.close();
      console.log('\n🔌 Closed main database connection');
    }
    
    if (licenseConnection) {
      await licenseConnection.close();
      console.log('🔌 Closed license database connection');
    }
  }
}

// Run the optimization if this script is executed directly
const isMainModule = process.argv[1] && process.argv[1].endsWith('optimize-database-indexes.js');

if (isMainModule) {
  console.log('🚀 Script executed directly, starting optimization...');
  optimizeDatabaseIndexes()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
} else {
  console.log('📦 Script imported as module');
}

export default optimizeDatabaseIndexes;