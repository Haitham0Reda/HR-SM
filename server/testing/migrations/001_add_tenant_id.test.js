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
import { MongoMemoryServer } from 'mongodb-memory-server';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the migration script
const MIGRATION_SCRIPT = path.join(__dirname, '../../scripts/migrations/001_add_tenant_id.js');
const DEFAULT_TENANT_ID = 'default_tenant';

describe('Migration 001: Add Tenant ID', () => {
    let mongoServer;
    let mongoUri;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create({
            instance: {
                storageEngine: 'ephemeralForTest',
            },
            binary: {
                version: '6.0.0',
            },
        });
        mongoUri = mongoServer.getUri();
    }, 60000);

    afterAll(async () => {
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    // Helper function to get a fresh connection
    async function getFreshConnection() {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        return await mongoose.connect(mongoUri);
    }

    // Helper function to clean up connection and data
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
            await mongoose.connection.close();
        }
    }

    afterEach(async () => {
        await cleanup();
    });

    describe('Test all records get tenantId after migration', () => {
        test('should add tenantId to all documents in users collection', async () => {
            await getFreshConnection();

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

            // Close connection before running migration
            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            // Reconnect and verify
            await getFreshConnection();
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
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();
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
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();

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
            await getFreshConnection();

            // Create test data
            const usersCollection = mongoose.connection.collection('users');
            await usersCollection.insertMany([
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' },
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager' }
            ]);

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();
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
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();
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
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();

            // Verify document counts are preserved
            for (const collectionName of collections) {
                const collection = mongoose.connection.collection(collectionName);
                const actualCount = await collection.countDocuments({});
                expect(actualCount).toBe(expectedCounts[collectionName]);
            }
        });

        test('should preserve complex nested data structures', async () => {
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            await getFreshConnection();
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
            await getFreshConnection();

            // Create test data
            const usersCollection = mongoose.connection.collection('users');
            const testUsers = [
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' },
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager' }
            ];

            await usersCollection.insertMany(testUsers);
            await mongoose.connection.close();

            // Run migration
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, {
                env,
                stdio: 'pipe'
            });

            // Verify migration worked
            await getFreshConnection();
            let usersAfterMigration = mongoose.connection.collection('users');
            let countWithTenantId = await usersAfterMigration.countDocuments({ tenantId: { $exists: true } });
            expect(countWithTenantId).toBe(2);

            await mongoose.connection.close();

            // Run rollback
            execSync(`node "${MIGRATION_SCRIPT}" rollback`, {
                env,
                stdio: 'pipe'
            });

            // Verify rollback worked
            await getFreshConnection();
            const usersAfterRollback = mongoose.connection.collection('users');
            const countWithoutTenantId = await usersAfterRollback.countDocuments({ tenantId: { $exists: false } });
            expect(countWithoutTenantId).toBe(2);

            // Verify no documents have tenantId
            const countWithTenantIdAfterRollback = await usersAfterRollback.countDocuments({ tenantId: { $exists: true } });
            expect(countWithTenantIdAfterRollback).toBe(0);
        });

        test('should preserve original data during rollback', async () => {
            await getFreshConnection();

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

            await mongoose.connection.close();

            // Run migration and rollback
            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });
            execSync(`node "${MIGRATION_SCRIPT}" rollback`, { env, stdio: 'pipe' });

            // Verify data is restored
            await getFreshConnection();
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
            await getFreshConnection();

            const usersCollection = mongoose.connection.collection('users');
            const testUser = {
                email: 'test@test.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'Employee'
            };

            await usersCollection.insertOne(testUser);
            await mongoose.connection.close();

            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            // Cycle 1: Migrate -> Rollback
            execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });
            execSync(`node "${MIGRATION_SCRIPT}" rollback`, { env, stdio: 'pipe' });

            // Cycle 2: Migrate -> Rollback
            execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });
            execSync(`node "${MIGRATION_SCRIPT}" rollback`, { env, stdio: 'pipe' });

            // Cycle 3: Migrate (final state)
            execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });

            // Verify final state
            await getFreshConnection();
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
            await getFreshConnection();

            // No test data - collections are empty
            await mongoose.connection.close();

            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            // Should not fail on empty collections
            expect(() => {
                execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });
            }).not.toThrow();

            await getFreshConnection();

            // Verify no errors occurred (collections should still be empty)
            const usersCollection = mongoose.connection.collection('users');
            const count = await usersCollection.countDocuments({});
            expect(count).toBe(0);
        });

        test('should handle documents that already have tenantId', async () => {
            await getFreshConnection();

            const usersCollection = mongoose.connection.collection('users');

            // Insert some documents with tenantId and some without
            await usersCollection.insertMany([
                { email: 'user1@test.com', firstName: 'User', lastName: 'One', role: 'Employee' }, // No tenantId
                { email: 'user2@test.com', firstName: 'User', lastName: 'Two', role: 'Manager', tenantId: DEFAULT_TENANT_ID }, // Has tenantId
                { email: 'user3@test.com', firstName: 'User', lastName: 'Three', role: 'Employee' } // No tenantId
            ]);

            await mongoose.connection.close();

            const env = {
                ...process.env,
                MONGODB_URI: mongoUri,
                DEFAULT_TENANT_ID: DEFAULT_TENANT_ID
            };

            // Should handle mixed state gracefully
            expect(() => {
                execSync(`node "${MIGRATION_SCRIPT}"`, { env, stdio: 'pipe' });
            }).not.toThrow();

            await getFreshConnection();
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