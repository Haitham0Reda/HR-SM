/**
 * Migration: 001_add_tenant_id.js
 * 
 * Purpose: Add tenantId field to all tenant-scoped collections and create compound indexes
 * 
 * This migration:
 * 1. Adds tenantId field to all tenant-scoped collections
 * 2. Assigns default tenantId ('default_tenant') to existing records
 * 3. Creates compound indexes (tenantId + other fields) for performance and isolation
 * 
 * Requirements: 14.4
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default_tenant';

/**
 * Collection configurations with their compound index requirements
 * Each entry specifies:
 * - collectionName: MongoDB collection name
 * - indexes: Array of compound indexes to create
 */
const COLLECTION_CONFIGS = [
    {
        collectionName: 'users',
        indexes: [
            { fields: { tenantId: 1, email: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, username: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, employeeId: 1 }, options: { unique: true, sparse: true } },
            { fields: { tenantId: 1, role: 1 }, options: {} },
            { fields: { tenantId: 1, department: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'departments',
        indexes: [
            { fields: { tenantId: 1, name: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, code: 1 }, options: { unique: true, sparse: true } }
        ]
    },
    {
        collectionName: 'positions',
        indexes: [
            { fields: { tenantId: 1, title: 1 }, options: {} },
            { fields: { tenantId: 1, department: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'attendances',
        indexes: [
            { fields: { tenantId: 1, employee: 1, date: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, department: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} },
            { fields: { tenantId: 1, date: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'attendancedevices',
        indexes: [
            { fields: { tenantId: 1, deviceId: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'requests',
        indexes: [
            { fields: { tenantId: 1, employee: 1, type: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} },
            { fields: { tenantId: 1, requestedAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'holidays',
        indexes: [
            { fields: { tenantId: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, year: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'missions',
        indexes: [
            { fields: { tenantId: 1, employee: 1, startDate: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'vacations',
        indexes: [
            { fields: { tenantId: 1, employee: 1, startDate: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} },
            { fields: { tenantId: 1, vacationType: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'mixedvacations',
        indexes: [
            { fields: { tenantId: 1, employee: 1, startDate: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'vacationbalances',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, year: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'overtimes',
        indexes: [
            { fields: { tenantId: 1, employee: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'forgetchecks',
        indexes: [
            { fields: { tenantId: 1, employee: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'documents',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: {} },
            { fields: { tenantId: 1, documentType: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'documenttemplates',
        indexes: [
            { fields: { tenantId: 1, name: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, category: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'events',
        indexes: [
            { fields: { tenantId: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, eventType: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'notifications',
        indexes: [
            { fields: { tenantId: 1, recipient: 1, read: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'tasks',
        indexes: [
            { fields: { tenantId: 1, assignedTo: 1, status: 1 }, options: {} },
            { fields: { tenantId: 1, dueDate: 1 }, options: {} },
            { fields: { tenantId: 1, priority: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'taskreports',
        indexes: [
            { fields: { tenantId: 1, task: 1 }, options: {} },
            { fields: { tenantId: 1, submittedBy: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'payrolls',
        indexes: [
            { fields: { tenantId: 1, employee: 1, month: 1, year: 1 }, options: { unique: true } },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'permissions',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'permissionaudits',
        indexes: [
            { fields: { tenantId: 1, user: 1 }, options: {} },
            { fields: { tenantId: 1, timestamp: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'reports',
        indexes: [
            { fields: { tenantId: 1, reportType: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'reportconfigs',
        indexes: [
            { fields: { tenantId: 1, name: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'reportexecutions',
        indexes: [
            { fields: { tenantId: 1, reportConfig: 1 }, options: {} },
            { fields: { tenantId: 1, executedAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'reportexports',
        indexes: [
            { fields: { tenantId: 1, report: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'resignedemployees',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: {} },
            { fields: { tenantId: 1, resignationDate: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'roles',
        indexes: [
            { fields: { tenantId: 1, name: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'surveys',
        indexes: [
            { fields: { tenantId: 1, status: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'surveynotifications',
        indexes: [
            { fields: { tenantId: 1, survey: 1, recipient: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'sickleaves',
        indexes: [
            { fields: { tenantId: 1, employee: 1, startDate: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'backups',
        indexes: [
            { fields: { tenantId: 1, createdAt: 1 }, options: {} },
            { fields: { tenantId: 1, status: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'backupexecutions',
        indexes: [
            { fields: { tenantId: 1, backup: 1 }, options: {} },
            { fields: { tenantId: 1, executedAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'dashboardconfigs',
        indexes: [
            { fields: { tenantId: 1, user: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'themeconfigs',
        indexes: [
            { fields: { tenantId: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'securitysettings',
        indexes: [
            { fields: { tenantId: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'securityaudits',
        indexes: [
            { fields: { tenantId: 1, timestamp: 1 }, options: {} },
            { fields: { tenantId: 1, eventType: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'announcements',
        indexes: [
            { fields: { tenantId: 1, createdAt: 1 }, options: {} },
            { fields: { tenantId: 1, priority: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'hardcopies',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: {} },
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'idcards',
        indexes: [
            { fields: { tenantId: 1, employee: 1 }, options: {} },
            { fields: { tenantId: 1, batch: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'idcardbatches',
        indexes: [
            { fields: { tenantId: 1, createdAt: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'requestcontrols',
        indexes: [
            { fields: { tenantId: 1, requestType: 1 }, options: {} }
        ]
    },
    {
        collectionName: 'schools',
        indexes: [
            { fields: { tenantId: 1, name: 1 }, options: { unique: true } }
        ]
    },
    {
        collectionName: 'usagetrackings',
        indexes: [
            { fields: { tenantId: 1, date: 1 }, options: {} },
            { fields: { tenantId: 1, feature: 1 }, options: {} }
        ]
    }
];

/**
 * Check if collection exists in database
 */
async function collectionExists(collectionName) {
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
}

/**
 * Add tenantId field to documents in a collection
 */
async function addTenantIdToCollection(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Count documents without tenantId
        const countWithout = await collection.countDocuments({
            tenantId: { $exists: false }
        });
        
        if (countWithout === 0) {
            console.log(`  ✓ Collection '${collectionName}' already has tenantId on all documents`);
            return 0;
        }
        
        // Add tenantId to documents that don't have it
        const result = await collection.updateMany(
            { tenantId: { $exists: false } },
            {
                $set: {
                    tenantId: DEFAULT_TENANT_ID,
                    updatedAt: new Date()
                }
            }
        );
        
        console.log(`  ✓ Added tenantId to ${result.modifiedCount} documents in '${collectionName}'`);
        return result.modifiedCount;
        
    } catch (error) {
        console.error(`  ✗ Error adding tenantId to '${collectionName}':`, error.message);
        throw error;
    }
}

/**
 * Create compound indexes for a collection
 */
async function createCompoundIndexes(collectionName, indexes) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        let createdCount = 0;
        
        for (const indexConfig of indexes) {
            try {
                // Check if index already exists
                const existingIndexes = await collection.indexes();
                const indexName = Object.keys(indexConfig.fields).join('_');
                const indexExists = existingIndexes.some(idx => 
                    JSON.stringify(idx.key) === JSON.stringify(indexConfig.fields)
                );
                
                if (indexExists) {
                    console.log(`    - Index on ${JSON.stringify(indexConfig.fields)} already exists`);
                    continue;
                }
                
                // Create the index
                await collection.createIndex(indexConfig.fields, indexConfig.options);
                console.log(`    ✓ Created index on ${JSON.stringify(indexConfig.fields)}`);
                createdCount++;
                
            } catch (error) {
                // If error is about duplicate key, it's okay - index exists
                if (error.code === 11000 || error.message.includes('already exists')) {
                    console.log(`    - Index on ${JSON.stringify(indexConfig.fields)} already exists`);
                } else {
                    console.error(`    ✗ Error creating index on ${JSON.stringify(indexConfig.fields)}:`, error.message);
                }
            }
        }
        
        return createdCount;
        
    } catch (error) {
        console.error(`  ✗ Error creating indexes for '${collectionName}':`, error.message);
        throw error;
    }
}

/**
 * Main migration function
 */
async function migrate() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🔧 Starting Migration: 001_add_tenant_id.js');
        console.log('='.repeat(70));
        console.log(`📍 Default Tenant ID: ${DEFAULT_TENANT_ID}`);
        console.log(`📍 Database: ${process.env.MONGODB_URI?.split('@')[1] || 'Unknown'}`);
        console.log('='.repeat(70) + '\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        let totalDocumentsUpdated = 0;
        let totalIndexesCreated = 0;
        let collectionsProcessed = 0;
        let collectionsSkipped = 0;
        
        // Process each collection
        for (const config of COLLECTION_CONFIGS) {
            console.log(`\n📦 Processing collection: ${config.collectionName}`);
            
            // Check if collection exists
            const exists = await collectionExists(config.collectionName);
            if (!exists) {
                console.log(`  ⊘ Collection does not exist, skipping...`);
                collectionsSkipped++;
                continue;
            }
            
            // Add tenantId field
            const documentsUpdated = await addTenantIdToCollection(config.collectionName);
            totalDocumentsUpdated += documentsUpdated;
            
            // Create compound indexes
            if (config.indexes && config.indexes.length > 0) {
                console.log(`  📊 Creating compound indexes...`);
                const indexesCreated = await createCompoundIndexes(config.collectionName, config.indexes);
                totalIndexesCreated += indexesCreated;
            }
            
            collectionsProcessed++;
        }
        
        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('✓ Migration Complete!');
        console.log('='.repeat(70));
        console.log(`📊 Collections processed: ${collectionsProcessed}`);
        console.log(`📊 Collections skipped: ${collectionsSkipped}`);
        console.log(`📊 Total documents updated: ${totalDocumentsUpdated}`);
        console.log(`📊 Total indexes created: ${totalIndexesCreated}`);
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
 * Rollback function (removes tenantId and indexes)
 */
async function rollback() {
    try {
        console.log('\n' + '='.repeat(70));
        console.log('🔄 Starting Rollback: 001_add_tenant_id.js');
        console.log('='.repeat(70) + '\n');
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database\n');
        
        let totalDocumentsUpdated = 0;
        let totalIndexesDropped = 0;
        
        for (const config of COLLECTION_CONFIGS) {
            console.log(`\n📦 Rolling back collection: ${config.collectionName}`);
            
            const exists = await collectionExists(config.collectionName);
            if (!exists) {
                console.log(`  ⊘ Collection does not exist, skipping...`);
                continue;
            }
            
            const collection = mongoose.connection.collection(config.collectionName);
            
            // Remove tenantId field
            const result = await collection.updateMany(
                { tenantId: DEFAULT_TENANT_ID },
                { $unset: { tenantId: '' } }
            );
            console.log(`  ✓ Removed tenantId from ${result.modifiedCount} documents`);
            totalDocumentsUpdated += result.modifiedCount;
            
            // Drop compound indexes
            if (config.indexes && config.indexes.length > 0) {
                for (const indexConfig of config.indexes) {
                    try {
                        const indexName = Object.keys(indexConfig.fields).join('_');
                        await collection.dropIndex(indexConfig.fields);
                        console.log(`    ✓ Dropped index on ${JSON.stringify(indexConfig.fields)}`);
                        totalIndexesDropped++;
                    } catch (error) {
                        if (error.message.includes('index not found')) {
                            console.log(`    - Index on ${JSON.stringify(indexConfig.fields)} does not exist`);
                        } else {
                            console.error(`    ✗ Error dropping index:`, error.message);
                        }
                    }
                }
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✓ Rollback Complete!');
        console.log('='.repeat(70));
        console.log(`📊 Total documents updated: ${totalDocumentsUpdated}`);
        console.log(`📊 Total indexes dropped: ${totalIndexesDropped}`);
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
