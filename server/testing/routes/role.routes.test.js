/**
 * @jest-environment node
 */
import express from 'express';
import request from 'supertest';
import Role from '../../models/role.model.js';
import User from '../../models/user.model.js';
import jwt from 'jsonwebtoken';

describe('Role Routes E2E Tests', () => {
    let app;
    let adminToken;
    let adminUser;

    beforeAll(async () => {
        // Create express app
        app = express();
        app.use(express.json());

        // Create mock middleware that bypasses authentication for testing
        const mockProtect = (req, res, next) => {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'Not authorized' });
            }
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
                req.user = decoded;
                next();
            } catch (error) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        };

        // Import controller functions directly
        const roleController = await import('../../controller/role.controller.js');
        
        // Create routes manually with mock middleware
        const router = express.Router();
        
        router.get('/', mockProtect, roleController.getAllRoles);
        router.get('/stats', mockProtect, roleController.getRoleStats);
        router.get('/permissions', mockProtect, roleController.getAllPermissions);
        router.post('/sync', mockProtect, roleController.syncSystemRoles);
        router.get('/:id', mockProtect, roleController.getRoleById);
        router.post('/', mockProtect, roleController.createRole);
        router.put('/:id', mockProtect, roleController.updateRole);
        router.delete('/:id', mockProtect, roleController.deleteRole);
        
        app.use('/api/roles', router);

        // Create admin user and token
        adminUser = await User.create({
            username: 'admin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            profile: {
                firstName: 'Admin',
                lastName: 'User',
                phoneNumber: '1234567890',
                nationalID: '12345678901234',
                dateOfBirth: new Date('1990-01-01'),
                hireDate: new Date()
            }
        });

        adminToken = jwt.sign(
            { _id: adminUser._id, username: adminUser.username, role: adminUser.role },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    describe('POST /api/roles - Create Role', () => {
        it('should create a new custom role', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'project-manager',
                    displayName: 'Project Manager',
                    description: 'Manages projects and teams',
                    permissions: ['users.view', 'documents.view', 'documents.create']
                })
                .expect(201);

            expect(response.body.name).toBe('project-manager');
            expect(response.body.displayName).toBe('Project Manager');
            expect(response.body.isSystemRole).toBe(false);
            expect(response.body.permissions).toHaveLength(3);
        });

        it('should fail with missing required fields', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    description: 'Missing name and displayName'
                })
                .expect(400);

            expect(response.body.error).toContain('required');
        });

        it('should fail with duplicate role name', async () => {
            await Role.create({
                name: 'duplicate-role',
                displayName: 'Duplicate Role',
                permissions: ['users.view']
            });

            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'duplicate-role',
                    displayName: 'Another Duplicate',
                    permissions: ['users.view']
                })
                .expect(409);

            expect(response.body.error).toContain('already exists');
        });

        it('should fail with invalid permissions', async () => {
            const response = await request(app)
                .post('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'invalid-perms',
                    displayName: 'Invalid Permissions',
                    permissions: ['invalid.permission', 'another.invalid']
                })
                .expect(400);

            expect(response.body.error).toContain('validation failed');
        });

        it('should fail without authentication', async () => {
            await request(app)
                .post('/api/roles')
                .send({
                    name: 'test-role',
                    displayName: 'Test Role',
                    permissions: ['users.view']
                })
                .expect(401);
        });
    });

    describe('GET /api/roles - Get All Roles', () => {
        beforeEach(async () => {
            await Role.create([
                {
                    name: 'admin',
                    displayName: 'Administrator',
                    permissions: ['users.view', 'users.create', 'users.edit'],
                    isSystemRole: true
                },
                {
                    name: 'custom-role-1',
                    displayName: 'Custom Role 1',
                    permissions: ['documents.view'],
                    isSystemRole: false
                },
                {
                    name: 'custom-role-2',
                    displayName: 'Custom Role 2',
                    permissions: ['reports.view'],
                    isSystemRole: false
                }
            ]);
        });

        it('should get all roles', async () => {
            const response = await request(app)
                .get('/api/roles')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
            expect(response.body[0]).toHaveProperty('permissionCount');
        });

        it('should filter by system roles', async () => {
            const response = await request(app)
                .get('/api/roles?type=system')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.every(role => role.isSystemRole === true)).toBe(true);
        });

        it('should filter by custom roles', async () => {
            const response = await request(app)
                .get('/api/roles?type=custom')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.every(role => role.isSystemRole === false)).toBe(true);
        });

        it('should search roles by name', async () => {
            const response = await request(app)
                .get('/api/roles?search=custom')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.length).toBeGreaterThanOrEqual(2);
            expect(response.body.every(role => 
                role.name.includes('custom') || 
                role.displayName.toLowerCase().includes('custom')
            )).toBe(true);
        });
    });

    describe('GET /api/roles/:id - Get Role By ID', () => {
        let testRole;

        beforeEach(async () => {
            testRole = await Role.create({
                name: 'view-test-role',
                displayName: 'View Test Role',
                description: 'Role for viewing tests',
                permissions: ['users.view', 'documents.view']
            });
        });

        it('should get role by ID', async () => {
            const response = await request(app)
                .get(`/api/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.name).toBe('view-test-role');
            expect(response.body.displayName).toBe('View Test Role');
            expect(response.body).toHaveProperty('permissionCount');
            expect(response.body.permissionCount).toBe(2);
        });

        it('should return 404 for non-existing role', async () => {
            const response = await request(app)
                .get('/api/roles/507f1f77bcf86cd799439099')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body.error).toBe('Role not found');
        });
    });

    describe('PUT /api/roles/:id - Update Role', () => {
        let testRole;

        beforeEach(async () => {
            testRole = await Role.create({
                name: 'update-test-role',
                displayName: 'Update Test Role',
                description: 'Original description',
                permissions: ['users.view'],
                isSystemRole: false
            });
        });

        it('should update role successfully', async () => {
            const response = await request(app)
                .put(`/api/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    displayName: 'Updated Role Name',
                    description: 'Updated description',
                    permissions: ['users.view', 'users.create', 'documents.view']
                })
                .expect(200);

            expect(response.body.displayName).toBe('Updated Role Name');
            expect(response.body.description).toBe('Updated description');
            expect(response.body.permissions).toHaveLength(3);
        });

        it('should prevent modifying system role name', async () => {
            const systemRole = await Role.create({
                name: 'system-role',
                displayName: 'System Role',
                permissions: ['users.view'],
                isSystemRole: true
            });

            const response = await request(app)
                .put(`/api/roles/${systemRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'new-system-name'
                })
                .expect(403);

            expect(response.body.error).toContain('system role');
        });

        it('should prevent changing isSystemRole flag', async () => {
            const systemRole = await Role.create({
                name: 'system-role-2',
                displayName: 'System Role 2',
                permissions: ['users.view'],
                isSystemRole: true
            });

            const response = await request(app)
                .put(`/api/roles/${systemRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    isSystemRole: false
                })
                .expect(403);

            expect(response.body.error).toContain('system role flag');
        });

        it('should fail with invalid permissions', async () => {
            const response = await request(app)
                .put(`/api/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    permissions: ['invalid.permission']
                })
                .expect(400);

            expect(response.body.error).toContain('validation failed');
        });
    });

    describe('DELETE /api/roles/:id - Delete Role', () => {
        let testRole;

        beforeEach(async () => {
            testRole = await Role.create({
                name: 'delete-test-role',
                displayName: 'Delete Test Role',
                permissions: ['users.view'],
                isSystemRole: false
            });
        });

        it('should delete custom role successfully', async () => {
            const response = await request(app)
                .delete(`/api/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.message).toContain('deleted successfully');

            const deletedRole = await Role.findById(testRole._id);
            expect(deletedRole).toBeNull();
        });

        it('should prevent deleting system roles', async () => {
            const systemRole = await Role.create({
                name: 'system-role-delete',
                displayName: 'System Role Delete',
                permissions: ['users.view'],
                isSystemRole: true
            });

            const response = await request(app)
                .delete(`/api/roles/${systemRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(403);

            expect(response.body.error).toContain('Cannot delete system roles');

            const stillExists = await Role.findById(systemRole._id);
            expect(stillExists).not.toBeNull();
        });

        it('should prevent deleting role with assigned users', async () => {
            await User.create({
                username: 'roleuser',
                email: 'roleuser@test.com',
                password: 'password123',
                role: 'delete-test-role',
                profile: {
                    firstName: 'Role',
                    lastName: 'User',
                    phoneNumber: '1234567890',
                    nationalID: '12345678901235',
                    dateOfBirth: new Date('1990-01-01'),
                    hireDate: new Date()
                }
            });

            const response = await request(app)
                .delete(`/api/roles/${testRole._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.error).toContain('assigned users');
            expect(response.body.details.userCount).toBe(1);
        });
    });

    describe('GET /api/roles/stats - Get Role Statistics', () => {
        beforeEach(async () => {
            await Role.create([
                {
                    name: 'admin',
                    displayName: 'Admin',
                    permissions: ['users.view'],
                    isSystemRole: true
                },
                {
                    name: 'hr',
                    displayName: 'HR',
                    permissions: ['users.view'],
                    isSystemRole: true
                },
                {
                    name: 'custom-1',
                    displayName: 'Custom 1',
                    permissions: ['users.view'],
                    isSystemRole: false
                },
                {
                    name: 'custom-2',
                    displayName: 'Custom 2',
                    permissions: ['users.view'],
                    isSystemRole: false
                }
            ]);
        });

        it('should return role statistics', async () => {
            const response = await request(app)
                .get('/api/roles/stats')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.totalRoles).toBeGreaterThanOrEqual(4);
            expect(response.body.systemRoles).toBeGreaterThanOrEqual(2);
            expect(response.body.customRoles).toBeGreaterThanOrEqual(2);
            expect(response.body.roleUserCounts).toBeDefined();
            expect(Array.isArray(response.body.roleUserCounts)).toBe(true);
        });
    });

    describe('POST /api/roles/sync - Sync System Roles', () => {
        it('should sync system roles from permission.system.js', async () => {
            const response = await request(app)
                .post('/api/roles/sync')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.message).toContain('synced successfully');
            expect(response.body).toHaveProperty('created');
            expect(response.body).toHaveProperty('updated');

            const systemRoles = await Role.getSystemRoles();
            expect(systemRoles.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/roles/permissions - Get All Permissions', () => {
        it('should return all permissions and categories', async () => {
            const response = await request(app)
                .get('/api/roles/permissions')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('permissions');
            expect(response.body).toHaveProperty('categories');
            expect(typeof response.body.permissions).toBe('object');
            expect(typeof response.body.categories).toBe('object');
        });
    });

    describe('Bulk Operations and Edge Cases', () => {
        it('should handle creating multiple roles in sequence', async () => {
            const roles = [
                { name: 'bulk-role-1', displayName: 'Bulk Role 1', permissions: ['users.view'] },
                { name: 'bulk-role-2', displayName: 'Bulk Role 2', permissions: ['documents.view'] },
                { name: 'bulk-role-3', displayName: 'Bulk Role 3', permissions: ['reports.view'] }
            ];

            for (const role of roles) {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(role)
                    .expect(201);

                expect(response.body.name).toBe(role.name);
            }

            const allRoles = await Role.find({ name: /^bulk-role-/ });
            expect(allRoles).toHaveLength(3);
        });

        it('should handle permission selection with bulk operations', async () => {
            const role = await Role.create({
                name: 'bulk-perm-role',
                displayName: 'Bulk Permission Role',
                permissions: ['users.view']
            });

            // Add multiple permissions
            const permissions = ['users.view', 'users.create', 'users.edit', 'documents.view', 'documents.create'];
            
            const response = await request(app)
                .put(`/api/roles/${role._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ permissions })
                .expect(200);

            expect(response.body.permissions).toHaveLength(permissions.length);
            expect(response.body.permissions).toEqual(expect.arrayContaining(permissions));
        });

        it('should handle form validation errors gracefully', async () => {
            const invalidRoles = [
                { displayName: 'No Name' },
                { name: 'no-display-name' },
                { name: '', displayName: 'Empty Name' },
                { name: 'invalid-perms', displayName: 'Invalid', permissions: ['fake.permission'] }
            ];

            for (const role of invalidRoles) {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(role);

                expect([400, 409]).toContain(response.status);
                expect(response.body).toHaveProperty('error');
            }
        });
    });
});
