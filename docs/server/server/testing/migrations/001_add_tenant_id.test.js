/**
 * Unit Tests for Migration: 001_add_tenant_id.js
 * 
 * Tests:
 * - All records get tenantId after migration
 * - No data loss during migration
 * - Migration is reversible
 * 
 * Requirements: 14.1, 14.4
 */

import mongoose from 'mongoose';

const DEFAULT_TENANT_ID = 'default_tenant';

// Migration functions (extracted from the migration script for testing)
async function addTenantIdToCollection(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Count documents without tenantId
        const countWithout = await collection.countDocuments({
            tenantId: { $exists: false }
        });
        
        if (countWithout === 0) {
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
        
        return result.modifiedCount;
        
    } catch (error) {
        throw error;
    }
}

async function createCompoundIndexes(collectionName, indexes) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        let createdCount = 0;
        
        for (const indexConfig of indexes) {
            try {
                // Check if index already exists
                const existingIndexes = await collection.indexes();
                const indexExists = existingIndexes.some(idx => 
                    JSON.stringify(idx.key) === JSON.stringify(indexConfig.fields)
                );
                
                if (indexExists) {
                    continue;
                }
                
                // Create the index
                await collection.createIndex(indexConfig.fields, indexConfig.options);
                createdCount++;
                
            } catch (error) {
                // If error is about duplicate key, it's okay - index exists
                if (error.code !== 11000 && !error.message.includes('already exists')) {
                    throw error;
                }
            }
        }
        
        return createdCount;
        
    } catch (error) {
        throw error;
    }
}

async function removeTenantIdFromCollection(collectionName) {
    try {
        const collection = mongoose.connection.collection(collectionName);
        
        // Remove tenantId field
        const result = await collection.updateMany(
            { tenantId: DEFAULT_TENANT_ID },
            { $unset: { tenantId: '' } }
        );
        
        return result.modifiedCount;
        
    } catch (error) {
        throw error;
    }
}

describe('Migration 001: Add Tenant ID', () => {
    // Helper function to clean up data and indexes
    async function cleanup() {
        if (mongoose.connection.readyState === 1) {
            // Clean up all data
            const collections = await mongoose.connection.db.listCollections().toArray();
            for (const collection of collections) {
                await mongoose.connection.db.collection(collection.name).deleteMany({});
                // Drop all indexes except _id
                try {
                    const indexes = await mongoose.connection.db.collection(collection.name).indexes();
                    for (const index of indexes) {
                        if (index.name !== '_id_') {
                            try {
                                await mongoose.connection.db.collection(collection.name).dropIndex(index.name);
                            } catch (error) {
                                // Ignore index drop errors
                            }
                        }
                    }
                } catch (error) {
                    // Ignore collection errors
                }
            }
        }
    }

    afterEach(async () => {
        await cleanup();
    });

    describe('Test all records get tenantId after migration', () => {
        test('should add tenantId to all documents in users collection', async () => {
            // Create test data without tenantId
            const usersCollection = mongoose.connection.collection('users');
            const testUsers = [
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' },
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager' },
                { email: 'user3@test.com', firstName: 'User', lastName: 'Three', role: 'Employee' }
            ];

            await usersCollection.insertMany(testUsers);

            // Verify no documents have tenantId initially
            const countBefore = await usersCollection.countDocuments({ tenantId: { $exists: true } });
            expect(countBefore).toBe(0);

            // Run migration
            const modifiedCount = await addTenantIdToCollection('users');
            expect(modifiedCount).toBe(3);

            // Verify results
            const usersAfter = mongoose.connection.collection('users');

            // All documents should have tenantId
            const countAfter = await usersAfter.countDocuments({ tenantId: DEFAULT_TENANT_ID });
            expect(countAfter).toBe(3);

            // Verify specific documents
            const users = await usersAfter.find({}).toArray();
            users.forEach(user => {
                expect(user.tenantId).toBe(DEFAULT_TENANT_ID);
                expect(user.email).toBeDefined();
                expect(user.firstName).toBeDefined();
                expect(user.lastName).toBeDefined();
                expect(user.role).toBeDefined();
            });
        });

        test('should add tenantId to all documents in attendances collection', async () => {
            const attendancesCollection = mongoose.connection.collection('attendances');
            const testAttendances = [
                { employee: new mongoose.Types.ObjectId(), date: new Date('2024-01-01'), status: 'present' },
                { employee: new mongoose.Types.ObjectId(), date: new Date('2024-01-02'), status: 'absent' },
                { employee: new mongoose.Types.ObjectId(), date: new Date('2024-01-03'), status: 'late' }
            ];

            await attendancesCollection.insertMany(testAttendances);

            // Verify no documents have tenantId initially
            const countBefore = await attendancesCollection.countDocuments({ tenantId: { $exists: true } });
            expect(countBefore).toBe(0);

            // Run migration
            const modifiedCount = await addTenantIdToCollection('attendances');
            expect(modifiedCount).toBe(3);

            const attendancesAfter = mongoose.connection.collection('attendances');

            // All documents should have tenantId
            const countAfter = await attendancesAfter.countDocuments({ tenantId: DEFAULT_TENANT_ID });
            expect(countAfter).toBe(3);

            // Verify data integrity
            const attendances = await attendancesAfter.find({}).toArray();
            attendances.forEach(attendance => {
                expect(attendance.tenantId).toBe(DEFAULT_TENANT_ID);
                expect(attendance.employee).toBeDefined();
                expect(attendance.date).toBeDefined();
                expect(attendance.status).toBeDefined();
            });
        });

        test('should add tenantId to multiple collections simultaneously', async () => {
            // Create test data in multiple collections
            const collections = ['users', 'departments', 'attendances', 'vacations'];
            const testData = {
                users: [
                    { email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'Employee' }
                ],
                departments: [
                    { name: 'Engineering', code: 'ENG' },
                    { name: 'HR', code: 'HR' }
                ],
                attendances: [
                    { employee: new mongoose.Types.ObjectId(), date: new Date(), status: 'present' }
                ],
                vacations: [
                    { employee: new mongoose.Types.ObjectId(), startDate: new Date(), endDate: new Date(), status: 'approved' }
                ]
            };

            // Insert test data
            for (const collectionName of collections) {
                const collection = mongoose.connection.collection(collectionName);
                await collection.insertMany(testData[collectionName]);
            }

            // Run migration on all collections
            for (const collectionName of collections) {
                await addTenantIdToCollection(collectionName);
            }

            // Verify all collections have tenantId
            for (const collectionName of collections) {
                const collection = mongoose.connection.collection(collectionName);
                const count = await collection.countDocuments({ tenantId: DEFAULT_TENANT_ID });
                expect(count).toBe(testData[collectionName].length);

                // Verify no documents without tenantId
                const countWithout = await collection.countDocuments({ tenantId: { $exists: false } });
                expect(countWithout).toBe(0);
            }
        });

        test('should create compound indexes after adding tenantId', async () => {
            // Create test data
            const usersCollection = mongoose.connection.collection('users');
            await usersCollection.insertMany([
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' },
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager' }
            ]);

            // Run migration
            await addTenantIdToCollection('users');

            // Create compound indexes
            const indexConfigs = [
                { fields: { tenantId: 1, email: 1 }, options: { unique: true } },
                { fields: { tenantId: 1, username: 1 }, options: { unique: true } }
            ];
            
            const createdCount = await createCompoundIndexes('users', indexConfigs);
            expect(createdCount).toBeGreaterThan(0);

            const usersAfter = mongoose.connection.collection('users');

            // Check that compound indexes were created
            const indexes = await usersAfter.indexes();

            // Should have compound index on tenantId + email
            const tenantEmailIndex = indexes.find(idx =>
                idx.key.tenantId === 1 && idx.key.email === 1
            );
            expect(tenantEmailIndex).toBeDefined();
            expect(tenantEmailIndex.unique).toBe(true);
        });
    });

    describe('Test no data loss during migration', () => {
        test('should preserve all original data fields', async () => {
            const usersCollection = mongoose.connection.collection('users');
            const originalUsers = [
                {
                    email: 'user1@test.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'Employee',
                    department: new mongoose.Types.ObjectId(),
                    status: 'active',
                    createdAt: new Date('2024-01-01'),
                    customField: 'custom_value'
                },
                {
                    email: 'user2@test.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    role: 'Manager',
                    department: new mongoose.Types.ObjectId(),
                    status: 'active',
                    createdAt: new Date('2024-01-02'),
                    customField: 'another_value'
                }
            ];

            await usersCollection.insertMany(originalUsers);

            // Store original data for comparison
            const originalData = await usersCollection.find({}).toArray();

            // Run migration
            await addTenantIdToCollection('users');

            const usersAfter = mongoose.connection.collection('users');

            // Get migrated data
            const migratedData = await usersAfter.find({}).toArray();

            expect(migratedData).toHaveLength(originalData.length);

            // Verify all original fields are preserved
            migratedData.forEach((migratedUser, index) => {
                const originalUser = originalData[index];

                // Check all original fields are preserved
                expect(migratedUser.email).toBe(originalUser.email);
                expect(migratedUser.firstName).toBe(originalUser.firstName);
                expect(migratedUser.lastName).toBe(originalUser.lastName);
                expect(migratedUser.role).toBe(originalUser.role);
                expect(migratedUser.department.toString()).toBe(originalUser.department.toString());
                expect(migratedUser.status).toBe(originalUser.status);
                expect(migratedUser.customField).toBe(originalUser.customField);

                // Check new field was added
                expect(migratedUser.tenantId).toBe(DEFAULT_TENANT_ID);

                // Check updatedAt was added/updated
                expect(migratedUser.updatedAt).toBeDefined();
            });
        });

        test('should preserve document count', async () => {
            const collections = ['users', 'departments', 'attendances'];
            const expectedCounts = {};

            // Create test data and record counts
            for (const collectionName of collections) {
                const collection = mongoose.connection.collection(collectionName);
                const testData = Array.from({ length: 5 }, (_, i) => ({
                    name: `Test ${collectionName} ${i}`,
                    value: i,
                    createdAt: new Date()
                }));

                await collection.insertMany(testData);
                expectedCounts[collectionName] = await collection.countDocuments({});
            }

            // Run migration
            for (const collectionName of collections) {
                await addTenantIdToCollection(collectionName);
            }

            // Verify document counts are preserved
            for (const collectionName of collections) {
                const collection = mongoose.connection.collection(collectionName);
                const actualCount = await collection.countDocuments({});
                expect(actualCount).toBe(expectedCounts[collectionName]);
            }
        });

        test('should preserve complex nested data structures', async () => {
            const tasksCollection = mongoose.connection.collection('tasks');
            const complexTask = {
                title: 'Complex Task',
                description: 'A task with nested data',
                assignedTo: new mongoose.Types.ObjectId(),
                metadata: {
                    priority: 'high',
                    tags: ['urgent', 'important'],
                    customFields: {
                        clientId: 'client_123',
                        projectPhase: 'development'
                    }
                },
                history: [
                    { action: 'created', timestamp: new Date('2024-01-01'), user: new mongoose.Types.ObjectId() },
                    { action: 'assigned', timestamp: new Date('2024-01-02'), user: new mongoose.Types.ObjectId() }
                ],
                attachments: [
                    { filename: 'doc1.pdf', size: 1024, uploadedAt: new Date() },
                    { filename: 'doc2.xlsx', size: 2048, uploadedAt: new Date() }
                ]
            };

            await tasksCollection.insertOne(complexTask);

            // Run migration
            await addTenantIdToCollection('tasks');

            const tasksAfter = mongoose.connection.collection('tasks');

            const migratedTask = await tasksAfter.findOne({ title: 'Complex Task' });

            // Verify all nested structures are preserved
            expect(migratedTask.tenantId).toBe(DEFAULT_TENANT_ID);
            expect(migratedTask.title).toBe(complexTask.title);
            expect(migratedTask.description).toBe(complexTask.description);
            expect(migratedTask.assignedTo.toString()).toBe(complexTask.assignedTo.toString());

            // Verify nested metadata
            expect(migratedTask.metadata.priority).toBe(complexTask.metadata.priority);
            expect(migratedTask.metadata.tags).toEqual(complexTask.metadata.tags);
            expect(migratedTask.metadata.customFields.clientId).toBe(complexTask.metadata.customFields.clientId);

            // Verify arrays
            expect(migratedTask.history).toHaveLength(complexTask.history.length);
            expect(migratedTask.attachments).toHaveLength(complexTask.attachments.length);
            expect(migratedTask.attachments[0].filename).toBe(complexTask.attachments[0].filename);
        });
    });

    describe('Test migration is reversible', () => {
        test('should remove tenantId field during rollback', async () => {
            // Create test data
            const usersCollection = mongoose.connection.collection('users');
            const testUsers = [
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' },
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager' }
            ];

            await usersCollection.insertMany(testUsers);

            // Run migration
            await addTenantIdToCollection('users');

            // Verify migration worked
            let usersAfterMigration = mongoose.connection.collection('users');
            let countWithTenantId = await usersAfterMigration.countDocuments({ tenantId: { $exists: true } });
            expect(countWithTenantId).toBe(2);

            // Run rollback
            await removeTenantIdFromCollection('users');

            // Verify rollback worked
            const usersAfterRollback = mongoose.connection.collection('users');
            const countWithoutTenantId = await usersAfterRollback.countDocuments({ tenantId: { $exists: false } });
            expect(countWithoutTenantId).toBe(2);

            // Verify no documents have tenantId
            const countWithTenantIdAfterRollback = await usersAfterRollback.countDocuments({ tenantId: { $exists: true } });
            expect(countWithTenantIdAfterRollback).toBe(0);
        });

        test('should preserve original data during rollback', async () => {
            const usersCollection = mongoose.connection.collection('users');
            const originalUsers = [
                {
                    email: 'user1@test.com',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'Employee',
                    customField: 'preserved_value'
                },
                {
                    email: 'user2@test.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    role: 'Manager',
                    customField: 'another_preserved_value'
                }
            ];

            await usersCollection.insertMany(originalUsers);

            // Store original data
            const originalData = await usersCollection.find({}).toArray();

            // Run migration and rollback
            await addTenantIdToCollection('users');
            await removeTenantIdFromCollection('users');

            // Verify data is restored
            const usersAfterRollback = mongoose.connection.collection('users');
            const restoredData = await usersAfterRollback.find({}).toArray();

            expect(restoredData).toHaveLength(originalData.length);

            restoredData.forEach((restoredUser, index) => {
                const originalUser = originalData[index];

                // Verify all original fields are preserved
                expect(restoredUser.email).toBe(originalUser.email);
                expect(restoredUser.firstName).toBe(originalUser.firstName);
                expect(restoredUser.lastName).toBe(originalUser.lastName);
                expect(restoredUser.role).toBe(originalUser.role);
                expect(restoredUser.customField).toBe(originalUser.customField);

                // Verify tenantId is removed
                expect(restoredUser.tenantId).toBeUndefined();
            });
        });

        test('should handle multiple migration and rollback cycles', async () => {
            const usersCollection = mongoose.connection.collection('users');
            const testUser = {
                email: 'test@test.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'Employee'
            };

            await usersCollection.insertOne(testUser);

            // Cycle 1: Migrate -> Rollback
            await addTenantIdToCollection('users');
            await removeTenantIdFromCollection('users');

            // Cycle 2: Migrate -> Rollback
            await addTenantIdToCollection('users');
            await removeTenantIdFromCollection('users');

            // Cycle 3: Migrate (final state)
            await addTenantIdToCollection('users');

            // Verify final state
            const usersAfterCycles = mongoose.connection.collection('users');

            const finalUser = await usersAfterCycles.findOne({ email: 'test@test.com' });
            expect(finalUser.tenantId).toBe(DEFAULT_TENANT_ID);
            expect(finalUser.email).toBe(testUser.email);
            expect(finalUser.firstName).toBe(testUser.firstName);
            expect(finalUser.lastName).toBe(testUser.lastName);
            expect(finalUser.role).toBe(testUser.role);

            // Verify document count is still 1
            const count = await usersAfterCycles.countDocuments({});
            expect(count).toBe(1);
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle empty collections gracefully', async () => {
            // No test data - collections are empty

            // Should not fail on empty collections
            const modifiedCount = await addTenantIdToCollection('users');
            expect(modifiedCount).toBe(0);

            // Verify no errors occurred (collections should still be empty)
            const usersCollection = mongoose.connection.collection('users');
            const count = await usersCollection.countDocuments({});
            expect(count).toBe(0);
        });

        test('should handle documents that already have tenantId', async () => {
            const usersCollection = mongoose.connection.collection('users');

            // Insert some documents with tenantId and some without
            await usersCollection.insertMany([
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' }, // No tenantId
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager', tenantId: DEFAULT_TENANT_ID }, // Has tenantId
                { email: 'user3@test.com', firstName: 'User', lastName: 'Three', role: 'Employee' } // No tenantId
            ]);

            // Should handle mixed state gracefully - only update documents without tenantId
            const modifiedCount = await addTenantIdToCollection('users');
            expect(modifiedCount).toBe(2); // Only 2 documents should be modified

            const usersAfter = mongoose.connection.collection('users');

            // All documents should have tenantId
            const countWithTenantId = await usersAfter.countDocuments({ tenantId: DEFAULT_TENANT_ID });
            expect(countWithTenantId).toBe(3);

            // No documents should be without tenantId
            const countWithoutTenantId = await usersAfter.countDocuments({ tenantId: { $exists: false } });
            expect(countWithoutTenantId).toBe(0);
        });
    });
});