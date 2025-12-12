/**
 * Migration: 002_create_default_tenant.js
 * 
 * Purpose: Create default tenant and platform admin user
 * 
 * This migration:
 * 1. Creates a default tenant with tenantId 'default_tenant'
 * 2. Assigns all existing data to the default tenant
 * 3. Creates a platform admin user for system administration
 * 4. Enables HR-Core module for the default tenant
 * 
 * Requirements: 18.1
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Import models (using dynamic import for ES modules)
let Tenant, PlatformUser;

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default_tenant';
const DEFAULT_COMPANY_NAME = process.env.DEFAULT_COMPANY_NAME || 'Default Company';
const PLATFORM_ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'admin@platform.local';
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin@123456';
const PLATFORM_ADMIN_FIRST_NAME = process.env.PLATFORM_ADMIN_FIRST_NAME || 'Platform';
const PLATFORM_ADMIN_LAST_NAME = process.env.PLATFORM_ADMIN_LAST_NAME || 'Administrator';

/**
 * Load models dynamically
 */
async function loadModels() {
    try {
        // Try to load models using require (CommonJS)
        Tenant = (await import('../../platform/tenants/models/Tenant.js')).default;
        PlatformUser = (await import('../../platform/models/PlatformUser.js')).default;
        
        // If models are exported as named exports or default, handle both cases
        if (!Tenant) {
            const tenantModule = await import('../../platform/tenants/models/Tenant.js');
            Tenant = tenantModule.Tenant || tenantModule.default;
        }
        if (!PlatformUser) {
            const platformUserModule = await import('../../platform/models/PlatformUser.js');
            PlatformUser = platformUserModule.PlatformUser || platformUserModule.default;
        }
        
        console.log('✓ Models loaded successfully');
    } catch (error) {
        console.error('✗ Error loading models:', error.message);
        throw error;
    }
}

/**
 * Create default tenant
 */
async function createDefaultTenant() {
    try {
        console.log('\n📦 Creating default tenant...');
        
        // Check if tenant already exists
        const existingTenant = await Tenant.findOne({ tenantId: DEFAULT_TENANT_ID });
        
        if (existingTenant) {
            console.log(`  ⚠ Tenant '${DEFAULT_TENANT_ID}' already exists`);
            console.log(`     Name: ${existingTenant.name}`);
            console.log(`     Status: ${existingTenant.status}`);
            console.log(`     Modules: ${existingTenant.enabledModules.length} enabled`);
            return existingTenant;
        }
        
        // Create new tenant
        const tenant = await Tenant.create({
            tenantId: DEFAULT_TENANT_ID,
            name: DEFAULT_COMPANY_NAME,
            status: 'active',
            deploymentMode: 'on-premise', // Default to on-premise for migration
            subscription: {
                status: 'active',
                startDate: new Date(),
                expiresAt: null, // No expiration for on-premise
                autoRenew: false
            },
            enabledModules: [
                {
                    moduleId: 'hr-core',
                    enabledAt: new Date(),
                    enabledBy: 'system'
                }
            ],
            config: {
                timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
                locale: process.env.DEFAULT_LOCALE || 'en-US',
                dateFormat: 'YYYY-MM-DD',
                timeFormat: '24h',
                currency: process.env.DEFAULT_CURRENCY || 'USD',
                features: {}
            },
            limits: {
                maxUsers: 10000, // High limit for on-premise
                maxStorage: 107374182400, // 100GB
                apiCallsPerMonth: 10000000 // 10M calls
            },
            usage: {
                userCount: 0,
                storageUsed: 0,
                apiCallsThisMonth: 0,
                lastResetDate: new Date()
            },
            contactInfo: {
                adminEmail: PLATFORM_ADMIN_EMAIL,
                adminName: `${PLATFORM_ADMIN_FIRST_NAME} ${PLATFORM_ADMIN_LAST_NAME}`
            }
        });
        
        console.log(`  ✓ Created tenant '${tenant.tenantId}'`);
        console.log(`     Name: ${tenant.name}`);
        console.log(`     Status: ${tenant.status}`);
        console.log(`     Mode: ${tenant.deploymentMode}`);
        console.log(`     Modules: ${tenant.enabledModules.length} enabled`);
        
        return tenant;
        
    } catch (error) {
        console.error('  ✗ Error creating tenant:', error.message);
        throw error;
    }
}

/**
 * Create platform admin user
 */
async function createPlatformAdmin() {
    try {
        console.log('\n👤 Creating platform admin user...');
        
        // Check if admin already exists
        const existingAdmin = await PlatformUser.findOne({ email: PLATFORM_ADMIN_EMAIL });
        
        if (existingAdmin) {
            console.log(`  ⚠ Platform admin '${PLATFORM_ADMIN_EMAIL}' already exists`);
            console.log(`     Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
            console.log(`     Role: ${existingAdmin.role}`);
            console.log(`     Status: ${existingAdmin.status}`);
            return existingAdmin;
        }
        
        // Create new platform admin
        const admin = await PlatformUser.create({
            email: PLATFORM_ADMIN_EMAIL,
            password: PLATFORM_ADMIN_PASSWORD,
            firstName: PLATFORM_ADMIN_FIRST_NAME,
            lastName: PLATFORM_ADMIN_LAST_NAME,
            role: 'super-admin',
            permissions: [], // Super-admin has all permissions by default
            status: 'active'
        });
        
        console.log(`  ✓ Created platform admin '${admin.email}'`);
        console.log(`     Name: ${admin.firstName} ${admin.lastName}`);
        console.log(`     Role: ${admin.role}`);
        console.log(`     Status: ${admin.status}`);
        console.log(`\n  ⚠ IMPORTANT: Default password is '${PLATFORM_ADMIN_PASSWORD}'`);
        console.log(`     Please change this password immediately after first login!`);
        
        return admin;
        
    } catch (error) {
        console.error('  ✗ Error creating platform admin:', error.message);
        throw error;
    }
}

/**
 * Verify data assignment to default tenant
 */
async function verifyDataAssignment() {
    try {
        console.log('\n🔍 Verifying data assignment to default tenant...');
        
        const collections = [
            'users',
            'departments',
            'attendances',
            'requests',
            'vacations',
            'tasks'
        ];
        
        let totalRecords = 0;
        let assignedRecords = 0;
        
        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.collection(collectionName);
                
                // Check if collection exists
                const exists = await mongoose.connection.db
                    .listCollections({ name: collectionName })
                    .hasNext();
                
                if (!exists) {
                    console.log(`  ⊘ Collection '${collectionName}' does not exist`);
                    continue;
                }
                
                const total = await collection.countDocuments({});
                const assigned = await collection.countDocuments({ tenantId: DEFAULT_TENANT_ID });
                
                totalRecords += total;
                assignedRecords += assigned;
                
                if (total > 0) {
                    const percentage = ((assigned / total) * 100).toFixed(1);
                    console.log(`  ✓ ${collectionName}: ${assigned}/${total} (${percentage}%) assigned to default tenant`);
                }
                
            } catch (error) {
                console.log(`  ⚠ Error checking '${collectionName}':`, error.message);
            }
        }
        
        console.log(`\n  📊 Total: ${assignedRecords}/${totalRecords} records assigned to default tenant`);
        
        if (totalRecords > 0 && assignedRecords < totalRecords) {
            console.log(`  ⚠ Warning: ${totalRecords - assignedRecords} records not assigned to default tenant`);
            console.log(`     Run migration 001_add_tenant_id.js first to assign tenantId to all records`);
        }
        
    } catch (error) {
        console.error('  ✗ Error verifying data assignment:', error.message);
        throw error;
    }
}

/**
 * Main migration function
 */
async function migrate() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🔧 Starting Migration: 002_create_default_tenant.js');
        console.log('='.repeat(70));
        console.log(`📍 Default Tenant ID: ${DEFAULT_TENANT_ID}`);
        console.log(`📍 Company Name: ${DEFAULT_COMPANY_NAME}`);
        console.log(`📍 Platform Admin Email: ${PLATFORM_ADMIN_EMAIL}`);
        console.log(`📍 Database: ${process.env.MONGODB_URI?.split('@')[1] || 'Unknown'}`);
        console.log('='.repeat(70) + '\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        // Load models
        await loadModels();
        
        // Step 1: Create default tenant
        const tenant = await createDefaultTenant();
        
        // Step 2: Create platform admin user
        const admin = await createPlatformAdmin();
        
        // Step 3: Verify data assignment
        await verifyDataAssignment();
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✓ Migration Complete!');
        console.log('='.repeat(70));
        console.log('📋 Summary:');
        console.log(`   - Tenant: ${tenant.tenantId} (${tenant.name})`);
        console.log(`   - Platform Admin: ${admin.email}`);
        console.log(`   - Enabled Modules: ${tenant.enabledModules.map(m => m.moduleId).join(', ')}`);
        console.log('\n⚠ NEXT STEPS:');
        console.log('   1. Change the platform admin password immediately');
        console.log('   2. Update tenant configuration as needed');
        console.log('   3. Enable additional modules if required');
        console.log('='.repeat(70) + '\n');
        
        await mongoose.disconnect();
        console.log('✓ Disconnected from database\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n' + '='.repeat(70));
        console.error('✗ Migration Failed!');
        console.error('='.repeat(70));
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('='.repeat(70) + '\n');
        
        await mongoose.disconnect();
        process.exit(1);
    }
}

/**
 * Rollback function (removes default tenant and platform admin)
 */
async function rollback() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🔄 Starting Rollback: 002_create_default_tenant.js');
        console.log('='.repeat(70) + '\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        await loadModels();
        
        // Remove default tenant
        console.log('📦 Removing default tenant...');
        const tenantResult = await Tenant.deleteOne({ tenantId: DEFAULT_TENANT_ID });
        if (tenantResult.deletedCount > 0) {
            console.log(`  ✓ Removed tenant '${DEFAULT_TENANT_ID}'`);
        } else {
            console.log(`  ⊘ Tenant '${DEFAULT_TENANT_ID}' not found`);
        }
        
        // Remove platform admin
        console.log('\n👤 Removing platform admin...');
        const adminResult = await PlatformUser.deleteOne({ email: PLATFORM_ADMIN_EMAIL });
        if (adminResult.deletedCount > 0) {
            console.log(`  ✓ Removed platform admin '${PLATFORM_ADMIN_EMAIL}'`);
        } else {
            console.log(`  ⊘ Platform admin '${PLATFORM_ADMIN_EMAIL}' not found`);
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✓ Rollback Complete!');
        console.log('='.repeat(70) + '\n');
        
        await mongoose.disconnect();
        process.exit(0);
        
    } catch (error) {
        console.error('\n✗ Rollback Failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Execute migration or rollback based on command line argument
const command = process.argv[2];

if (command === 'rollback') {
    rollback();
} else {
    migrate();
}
