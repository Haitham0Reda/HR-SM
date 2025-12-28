import mongoose from 'mongoose';
import PlatformUserRepository from '../../../repositories/platform/PlatformUserRepository.js';
import PlatformUser from '../../../platform/models/PlatformUser.js';

describe('PlatformUserRepository', () => {
    let platformUserRepository;
    let testUsers = [];

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        platformUserRepository = new PlatformUserRepository();
    });

    beforeEach(async () => {
        // Clean up test data
        await PlatformUser.deleteMany({ email: /^test/ });
        testUsers = [];
    });

    afterAll(async () => {
        // Clean up test data
        await PlatformUser.deleteMany({ email: /^test/ });
    });

    describe('Basic CRUD Operations', () => {
        it('should create a platform user successfully', async () => {
            const userData = {
                email: 'test.admin@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'Admin',
                role: 'super-admin',
                permissions: ['manage_users', 'manage_companies']
            };

            const user = await platformUserRepository.createUser(userData);
            testUsers.push(user);

            expect(user).toBeDefined();
            expect(user.email).toBe(userData.email);
            expect(user.firstName).toBe(userData.firstName);
            expect(user.lastName).toBe(userData.lastName);
            expect(user.role).toBe(userData.role);
            expect(user.password).toBeUndefined(); // Should be excluded in safe object
            expect(user.permissions).toEqual(userData.permissions);
        });

        it('should find user by ID', async () => {
            const userData = {
                email: 'test.user@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'User',
                role: 'support'
            };

            const createdUser = await platformUserRepository.createUser(userData);
            testUsers.push(createdUser);

            const foundUser = await platformUserRepository.findById(createdUser.id);

            expect(foundUser).toBeDefined();
            expect(foundUser._id.toString()).toBe(createdUser.id);
            expect(foundUser.email).toBe(userData.email);
        });

        it('should update user successfully', async () => {
            const userData = {
                email: 'test.update@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'Update',
                role: 'operations'
            };

            const createdUser = await platformUserRepository.createUser(userData);
            testUsers.push(createdUser);

            const updateData = { firstName: 'Updated', lastName: 'Name' };
            const updatedUser = await platformUserRepository.update(createdUser.id, updateData);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.firstName).toBe('Updated');
            expect(updatedUser.lastName).toBe('Name');
        });

        it('should delete user successfully', async () => {
            const userData = {
                email: 'test.delete@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'Delete',
                role: 'support'
            };

            const createdUser = await platformUserRepository.createUser(userData);
            const deleted = await platformUserRepository.delete(createdUser.id);

            expect(deleted).toBe(true);

            const foundUser = await platformUserRepository.findById(createdUser.id);
            expect(foundUser).toBeNull();
        });
    });

    describe('User Lookup Methods', () => {
        beforeEach(async () => {
            const users = [
                {
                    email: 'test.lookup1@platform.com',
                    password: 'testpassword123',
                    firstName: 'John',
                    lastName: 'Doe',
                    role: 'super-admin',
                    status: 'active',
                    permissions: ['manage_all']
                },
                {
                    email: 'test.lookup2@platform.com',
                    password: 'testpassword123',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    role: 'support',
                    status: 'active',
                    permissions: ['view_companies', 'manage_tickets']
                },
                {
                    email: 'test.lookup3@platform.com',
                    password: 'testpassword123',
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    role: 'operations',
                    status: 'inactive',
                    permissions: ['manage_infrastructure']
                }
            ];

            for (const userData of users) {
                const user = await platformUserRepository.createUser(userData);
                testUsers.push(user);
            }
        });

        it('should find user by email', async () => {
            const user = await platformUserRepository.findByEmail('test.lookup1@platform.com');

            expect(user).toBeDefined();
            expect(user.email).toBe('test.lookup1@platform.com');
            expect(user.firstName).toBe('John');
        });

        it('should find users by role', async () => {
            const supportUsers = await platformUserRepository.findByRole('support');
            const adminUsers = await platformUserRepository.findByRole('super-admin');

            expect(supportUsers.length).toBeGreaterThanOrEqual(1);
            expect(adminUsers.length).toBeGreaterThanOrEqual(1);
            
            supportUsers.forEach(user => {
                expect(user.role).toBe('support');
            });
        });

        it('should find active users by role', async () => {
            const activeSupport = await platformUserRepository.findActiveByRole('support');
            const activeOperations = await platformUserRepository.findActiveByRole('operations');

            expect(activeSupport.length).toBeGreaterThanOrEqual(1);
            expect(activeOperations.length).toBe(0); // operations user is inactive

            activeSupport.forEach(user => {
                expect(user.role).toBe('support');
                expect(user.status).toBe('active');
            });
        });

        it('should find users by status', async () => {
            const activeUsers = await platformUserRepository.findByStatus('active');
            const inactiveUsers = await platformUserRepository.findByStatus('inactive');

            expect(activeUsers.length).toBeGreaterThanOrEqual(2);
            expect(inactiveUsers.length).toBeGreaterThanOrEqual(1);
        });

        it('should find users by permission', async () => {
            const usersWithViewCompanies = await platformUserRepository.findByPermission('view_companies');
            const usersWithManageAll = await platformUserRepository.findByPermission('manage_all');

            expect(usersWithViewCompanies.length).toBeGreaterThanOrEqual(1);
            expect(usersWithManageAll.length).toBeGreaterThanOrEqual(1); // Super-admin has all permissions
        });
    });

    describe('Password Operations', () => {
        beforeEach(async () => {
            const userData = {
                email: 'test.password@platform.com',
                password: 'originalpassword123',
                firstName: 'Test',
                lastName: 'Password',
                role: 'support'
            };

            const user = await platformUserRepository.createUser(userData);
            testUsers.push(user);
        });

        it('should update password successfully', async () => {
            const user = testUsers[0];
            const newPassword = 'newpassword456';

            const updatedUser = await platformUserRepository.updatePassword(user.id, newPassword);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.password).toBeUndefined(); // Should be excluded in safe object

            // Verify password was actually updated by fetching the full user
            const fullUser = await PlatformUser.findById(user.id).select('+password');
            expect(fullUser.password).not.toBe('newpassword456'); // Should be hashed
            expect(fullUser.password.length).toBeGreaterThan(20); // Hashed password is longer
        });
    });

    describe('Permission Operations', () => {
        beforeEach(async () => {
            const userData = {
                email: 'test.permissions@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'Permissions',
                role: 'support',
                permissions: ['view_companies', 'manage_tickets']
            };

            const user = await platformUserRepository.createUser(userData);
            testUsers.push(user);
        });

        it('should update permissions successfully', async () => {
            const user = testUsers[0];
            const newPermissions = ['view_companies', 'manage_tickets', 'view_analytics'];

            const updatedUser = await platformUserRepository.updatePermissions(user.id, newPermissions);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.permissions).toEqual(newPermissions);
        });

        it('should add permission successfully', async () => {
            const user = testUsers[0];
            const newPermission = 'manage_billing';

            const updatedUser = await platformUserRepository.addPermission(user.id, newPermission);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.permissions).toContain(newPermission);
            expect(updatedUser.permissions).toContain('view_companies'); // Original permissions preserved
        });

        it('should not add duplicate permission', async () => {
            const user = testUsers[0];
            const existingPermission = 'view_companies';
            const originalLength = user.permissions.length;

            const updatedUser = await platformUserRepository.addPermission(user.id, existingPermission);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.permissions.length).toBe(originalLength);
        });

        it('should remove permission successfully', async () => {
            const user = testUsers[0];
            const permissionToRemove = 'manage_tickets';

            const updatedUser = await platformUserRepository.removePermission(user.id, permissionToRemove);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.permissions).not.toContain(permissionToRemove);
            expect(updatedUser.permissions).toContain('view_companies'); // Other permissions preserved
        });
    });

    describe('Status Operations', () => {
        beforeEach(async () => {
            const userData = {
                email: 'test.status@platform.com',
                password: 'testpassword123',
                firstName: 'Test',
                lastName: 'Status',
                role: 'support',
                status: 'active'
            };

            const user = await platformUserRepository.createUser(userData);
            testUsers.push(user);
        });

        it('should lock user successfully', async () => {
            const user = testUsers[0];

            const lockedUser = await platformUserRepository.lockUser(user.id);

            expect(lockedUser).toBeDefined();
            expect(lockedUser.status).toBe('locked');
        });

        it('should unlock user successfully', async () => {
            const user = testUsers[0];

            // First lock the user
            await platformUserRepository.lockUser(user.id);
            
            // Then unlock
            const unlockedUser = await platformUserRepository.unlockUser(user.id);

            expect(unlockedUser).toBeDefined();
            expect(unlockedUser.status).toBe('active');
        });

        it('should deactivate user successfully', async () => {
            const user = testUsers[0];

            const deactivatedUser = await platformUserRepository.deactivateUser(user.id);

            expect(deactivatedUser).toBeDefined();
            expect(deactivatedUser.status).toBe('inactive');
        });

        it('should update last login successfully', async () => {
            const user = testUsers[0];
            const loginTime = new Date();

            const updatedUser = await platformUserRepository.updateLastLogin(user.id, loginTime);

            expect(updatedUser).toBeDefined();
            expect(updatedUser.lastLogin).toBeInstanceOf(Date);
            expect(Math.abs(updatedUser.lastLogin.getTime() - loginTime.getTime())).toBeLessThan(1000);
        });
    });

    describe('Search and Analytics', () => {
        beforeEach(async () => {
            const users = [
                {
                    email: 'test.search1@platform.com',
                    password: 'testpassword123',
                    firstName: 'Alice',
                    lastName: 'Johnson',
                    role: 'super-admin',
                    status: 'active',
                    lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
                },
                {
                    email: 'test.search2@platform.com',
                    password: 'testpassword123',
                    firstName: 'Bob',
                    lastName: 'Smith',
                    role: 'support',
                    status: 'active',
                    lastLogin: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
                },
                {
                    email: 'test.search3@platform.com',
                    password: 'testpassword123',
                    firstName: 'Charlie',
                    lastName: 'Brown',
                    role: 'operations',
                    status: 'locked',
                    lastLogin: null
                }
            ];

            for (const userData of users) {
                const user = await platformUserRepository.createUser(userData);
                testUsers.push(user);
            }
        });

        it('should search users by name', async () => {
            const aliceResults = await platformUserRepository.searchUsers('Alice');
            const johnsonResults = await platformUserRepository.searchUsers('Johnson');

            expect(aliceResults.length).toBeGreaterThanOrEqual(1);
            expect(johnsonResults.length).toBeGreaterThanOrEqual(1);
            
            aliceResults.forEach(user => {
                const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                expect(fullName).toContain('alice');
            });
        });

        it('should search users by email', async () => {
            const emailResults = await platformUserRepository.searchUsers('test.search1');

            expect(emailResults.length).toBeGreaterThanOrEqual(1);
            emailResults.forEach(user => {
                expect(user.email.toLowerCase()).toContain('test.search1');
            });
        });

        it('should find inactive users', async () => {
            const inactiveUsers = await platformUserRepository.findInactiveUsers(30); // 30 days

            expect(inactiveUsers.length).toBeGreaterThanOrEqual(2); // Bob (45 days) and Charlie (never logged in)
            inactiveUsers.forEach(user => {
                if (user.lastLogin) {
                    const daysSinceLogin = Math.ceil((new Date() - user.lastLogin) / (1000 * 60 * 60 * 24));
                    expect(daysSinceLogin).toBeGreaterThan(30);
                } else {
                    expect(user.lastLogin).toBeNull();
                }
            });
        });

        it('should get user statistics', async () => {
            const stats = await platformUserRepository.getUserStatistics();

            expect(stats).toBeDefined();
            expect(stats.byRole).toBeInstanceOf(Array);
            expect(stats.totals).toBeDefined();
            expect(stats.totals.total).toBeGreaterThanOrEqual(3);
            expect(stats.totals.active).toBeGreaterThanOrEqual(2);
            expect(stats.totals.locked).toBeGreaterThanOrEqual(1);

            stats.byRole.forEach(roleStats => {
                expect(roleStats.role).toBeDefined();
                expect(roleStats.total).toBeGreaterThanOrEqual(0);
                expect(roleStats.active).toBeGreaterThanOrEqual(0);
                expect(roleStats.inactive).toBeGreaterThanOrEqual(0);
                expect(roleStats.locked).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid ObjectId gracefully', async () => {
            const user = await platformUserRepository.findById('invalid-id');
            expect(user).toBeNull();
        });

        it('should handle non-existent user update', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const updatedUser = await platformUserRepository.update(nonExistentId, { firstName: 'Updated' });
            expect(updatedUser).toBeNull();
        });

        it('should handle non-existent user deletion', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const deleted = await platformUserRepository.delete(nonExistentId);
            expect(deleted).toBe(false);
        });

        it('should handle non-existent user for permission operations', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            
            const addResult = await platformUserRepository.addPermission(nonExistentId, 'test_permission');
            expect(addResult).toBeNull();
            
            const removeResult = await platformUserRepository.removePermission(nonExistentId, 'test_permission');
            expect(removeResult).toBeNull();
        });
    });
});