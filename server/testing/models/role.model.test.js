/**
 * @jest-environment node
 */
import Role from '../../models/role.model.js';
import { PERMISSIONS } from '../../models/permission.system.js';

describe('Role Model', () => {
    describe('Schema Validation', () => {
        it('should create a valid role with required fields', async () => {
            const roleData = {
                name: 'test-role',
                displayName: 'Test Role',
                description: 'A test role',
                permissions: ['users.view', 'documents.view'],
                isSystemRole: false
            };

            const role = await Role.create(roleData);

            expect(role.name).toBe('test-role');
            expect(role.displayName).toBe('Test Role');
            expect(role.description).toBe('A test role');
            expect(role.permissions).toHaveLength(2);
            expect(role.isSystemRole).toBe(false);
        });

        it('should fail when name is missing', async () => {
            const roleData = {
                displayName: 'Test Role',
                permissions: ['users.view']
            };

            await expect(Role.create(roleData)).rejects.toThrow();
        });

        it('should fail when displayName is missing', async () => {
            const roleData = {
                name: 'test-role',
                permissions: ['users.view']
            };

            await expect(Role.create(roleData)).rejects.toThrow();
        });

        it('should convert name to lowercase', async () => {
            const roleData = {
                name: 'TEST-ROLE',
                displayName: 'Test Role',
                permissions: ['users.view']
            };

            const role = await Role.create(roleData);
            expect(role.name).toBe('test-role');
        });

        it('should enforce unique name constraint', async () => {
            const roleData = {
                name: 'unique-role',
                displayName: 'Unique Role',
                permissions: ['users.view']
            };

            await Role.create(roleData);
            await expect(Role.create(roleData)).rejects.toThrow();
        });

        it('should validate permissions against PERMISSIONS object', async () => {
            const roleData = {
                name: 'invalid-permissions-role',
                displayName: 'Invalid Permissions Role',
                permissions: ['invalid.permission', 'another.invalid']
            };

            await expect(Role.create(roleData)).rejects.toThrow();
        });

        it('should accept valid permissions', async () => {
            const validPermissions = Object.keys(PERMISSIONS).slice(0, 5);
            const roleData = {
                name: 'valid-permissions-role',
                displayName: 'Valid Permissions Role',
                permissions: validPermissions
            };

            const role = await Role.create(roleData);
            expect(role.permissions).toEqual(validPermissions);
        });
    });

    describe('Instance Methods', () => {
        let testRole;

        beforeEach(async () => {
            testRole = await Role.create({
                name: 'method-test-role',
                displayName: 'Method Test Role',
                permissions: ['users.view', 'users.create', 'documents.view']
            });
        });

        describe('getPermissionCount', () => {
            it('should return correct permission count', () => {
                expect(testRole.getPermissionCount()).toBe(3);
            });

            it('should return 0 for role with no permissions', async () => {
                const emptyRole = new Role({
                    name: 'empty-role',
                    displayName: 'Empty Role',
                    permissions: []
                });

                expect(emptyRole.getPermissionCount()).toBe(0);
            });
        });

        describe('hasPermission', () => {
            it('should return true for existing permission', () => {
                expect(testRole.hasPermission('users.view')).toBe(true);
            });

            it('should return false for non-existing permission', () => {
                expect(testRole.hasPermission('users.delete')).toBe(false);
            });
        });

        describe('addPermissions', () => {
            it('should add single permission', () => {
                testRole.addPermissions('users.edit');
                expect(testRole.permissions).toContain('users.edit');
                expect(testRole.getPermissionCount()).toBe(4);
            });

            it('should add multiple permissions', () => {
                testRole.addPermissions(['users.edit', 'users.delete']);
                expect(testRole.permissions).toContain('users.edit');
                expect(testRole.permissions).toContain('users.delete');
                expect(testRole.getPermissionCount()).toBe(5);
            });

            it('should not add duplicate permissions', () => {
                testRole.addPermissions('users.view');
                expect(testRole.getPermissionCount()).toBe(3);
            });
        });

        describe('removePermissions', () => {
            it('should remove single permission', () => {
                testRole.removePermissions('users.view');
                expect(testRole.permissions).not.toContain('users.view');
                expect(testRole.getPermissionCount()).toBe(2);
            });

            it('should remove multiple permissions', () => {
                testRole.removePermissions(['users.view', 'users.create']);
                expect(testRole.permissions).not.toContain('users.view');
                expect(testRole.permissions).not.toContain('users.create');
                expect(testRole.getPermissionCount()).toBe(1);
            });

            it('should handle removing non-existing permission', () => {
                testRole.removePermissions('users.delete');
                expect(testRole.getPermissionCount()).toBe(3);
            });
        });
    });

    describe('Static Methods', () => {
        beforeEach(async () => {
            await Role.create([
                {
                    name: 'system-admin',
                    displayName: 'System Admin',
                    permissions: ['users.view'],
                    isSystemRole: true
                },
                {
                    name: 'custom-manager',
                    displayName: 'Custom Manager',
                    permissions: ['users.view'],
                    isSystemRole: false
                },
                {
                    name: 'system-hr',
                    displayName: 'System HR',
                    permissions: ['users.view'],
                    isSystemRole: true
                }
            ]);
        });

        describe('findByName', () => {
            it('should find role by name', async () => {
                const role = await Role.findByName('system-admin');
                expect(role).toBeDefined();
                expect(role.displayName).toBe('System Admin');
            });

            it('should find role by name case-insensitively', async () => {
                const role = await Role.findByName('SYSTEM-ADMIN');
                expect(role).toBeDefined();
                expect(role.displayName).toBe('System Admin');
            });

            it('should return null for non-existing role', async () => {
                const role = await Role.findByName('non-existing');
                expect(role).toBeNull();
            });
        });

        describe('getSystemRoles', () => {
            it('should return only system roles', async () => {
                const systemRoles = await Role.getSystemRoles();
                expect(systemRoles).toHaveLength(2);
                systemRoles.forEach(role => {
                    expect(role.isSystemRole).toBe(true);
                });
            });
        });

        describe('getCustomRoles', () => {
            it('should return only custom roles', async () => {
                const customRoles = await Role.getCustomRoles();
                expect(customRoles).toHaveLength(1);
                customRoles.forEach(role => {
                    expect(role.isSystemRole).toBe(false);
                });
            });
        });
    });
});
