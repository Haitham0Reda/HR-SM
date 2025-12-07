import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'default';

async function migrateTenantId() {
    try {
        console.log('🔧 Starting tenant ID migration...');
        console.log(`📍 Default Tenant ID: ${DEFAULT_TENANT_ID}`);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to database');

        // List of collections to migrate
        const collections = [
            'users',
            'departments',
            'positions',
            'attendances',
            'attendancedevices',
            'documents',
            'documenttemplates',
            'events',
            'holidays',
            'missions',
            'mixedvacations',
            'notifications',
            'overtimes',
            'payrolls',
            'permissions',
            'reports',
            'requests',
            'resignedemployees',
            'surveys',
            'tasks',
            'vacations',
            'vacationbalances'
        ];

        let totalUpdated = 0;

        for (const collectionName of collections) {
            try {
                const collection = mongoose.connection.collection(collectionName);

                // Check if collection exists
                const collectionExists = await mongoose.connection.db
                    .listCollections({ name: collectionName })
                    .hasNext();

                if (!collectionExists) {
                    console.log(`⊘ Collection '${collectionName}' does not exist, skipping...`);
                    continue;
                }

                // Count documents without tenantId
                const countWithout = await collection.countDocuments({
                    tenantId: { $exists: false }
                });

                if (countWithout === 0) {
                    console.log(`✓ Collection '${collectionName}' already has tenantId on all documents`);
                    continue;
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

                console.log(`✓ Updated ${result.modifiedCount} documents in '${collectionName}'`);
                totalUpdated += result.modifiedCount;

            } catch (error) {
                console.error(`✗ Error migrating collection '${collectionName}':`, error.message);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✓ Migration complete!`);
        console.log(`📊 Total documents updated: ${totalUpdated}`);
        console.log('='.repeat(50) + '\n');

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateTenantId();
