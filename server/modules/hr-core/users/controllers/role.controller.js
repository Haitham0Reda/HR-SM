// Role Controller
import Role from '../models/role.model.js';
import User from '../models/user.model.js';
import { ROLE_PERMISSIONS, PERMISSIONS, PERMISSION_CATEGORIES } from '../../../../platform/system/models/permission.system.js';
import logger from '../../../../utils/logger.js';
import {
    logRoleCreation,
    logRoleUpdate,
    logRoleDeletion,
    logRoleView,
    logRolesSync,
    logRoleOperationFailure
} from '../utils/roleAuditLogger.js';
import { validatePermissions } from '../../../../utils/permissionValidator.js';

// Get all roles with filtering and search support
export const getAllRoles = async (req, res) => {
    try {
        const { type, search } = req.query;
        
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('🔍 Fetching roles for tenant:', tenantId);
        
        // Build query with tenant filtering
        let query = {
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        // Filter by type (system/custom)
        if (type === 'system') {
            query = { isSystemRole: true };
        } else if (type === 'custom') {
            query = { tenantId: tenantId, isSystemRole: false };
        }
        
        // Search by name or description
        if (search) {
            const searchQuery = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { displayName: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
            
            // Combine tenant filtering with search
            if (type === 'system') {
                query = { isSystemRole: true, ...searchQuery };
            } else if (type === 'custom') {
                query = { tenantId: tenantId, isSystemRole: false, ...searchQuery };
            } else {
                query = {
                    $and: [
                        {
                            $or: [
                                { isSystemRole: true },
                                { tenantId: tenantId, isSystemRole: false }
                            ]
                        },
                        searchQuery
                    ]
                };
            }
        }
        
        console.log('📋 Role query:', JSON.stringify(query, null, 2));
        
        const roles = await Role.find(query)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email')
            .sort({ isSystemRole: -1, name: 1 });
        
        console.log(`✓ Found ${roles.length} roles for tenant ${tenantId}`);
        
        // Add permission count to each role
        const rolesWithCount = roles.map(role => ({
            ...role.toObject(),
            permissionCount: role.getPermissionCount()
        }));
        
        res.status(200).json(rolesWithCount);
    } catch (err) {
        console.error('❌ Error fetching roles:', err);
        logger.error('Error fetching roles:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get role by ID with full permission details
export const getRoleById = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('🔍 Fetching role by ID for tenant:', tenantId);
        
        // Build query with tenant filtering
        const query = {
            _id: req.params.id,
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        const role = await Role.findOne(query)
            .populate('createdBy', 'username email')
            .populate('updatedBy', 'username email');
        
        if (!role) {
            console.log(`❌ Role not found with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ error: 'Role not found' });
        }
        
        console.log(`✓ Found role ${role.name} for tenant ${tenantId}`);
        
        // Log role view for audit trail
        await logRoleView(role, req.user, req);
        
        // Add permission count
        const roleData = {
            ...role.toObject(),
            permissionCount: role.getPermissionCount()
        };
        
        res.status(200).json(roleData);
    } catch (err) {
        console.error('❌ Error fetching role by ID:', err);
        logger.error('Error fetching role by ID:', err);
        res.status(500).json({ error: err.message });
    }
};

// Create new role with validation and duplicate checking
export const createRole = async (req, res) => {
    try {
        const { name, displayName, description, permissions } = req.body;
        
        // Validate required fields
        if (!name || !displayName) {
            return res.status(400).json({ 
                error: 'Name and display name are required' 
            });
        }
        
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('👤 Creating role for tenant:', tenantId);
        
        // Check for duplicate name within tenant scope
        const existingRole = await Role.findByName(name, tenantId);
        if (existingRole) {
            return res.status(409).json({ 
                error: 'A role with this name already exists' 
            });
        }
        
        // Validate permissions using validation utility
        if (permissions) {
            const validation = validatePermissions(permissions);
            if (!validation.valid) {
                return res.status(400).json({ 
                    error: 'Permission validation failed',
                    message: validation.errors.join('; '),
                    details: { 
                        errors: validation.errors,
                        invalidPermissions: validation.invalidPermissions,
                        validPermissions: Object.keys(PERMISSIONS)
                    }
                });
            }
        }
        
        // Create role with tenant context
        const role = new Role({
            name,
            displayName,
            description,
            permissions: permissions || [],
            isSystemRole: false,
            tenantId: tenantId,
            createdBy: req.user._id,
            updatedBy: req.user._id
        });
        
        console.log('✓ Creating role with tenant ID:', tenantId);
        
        await role.save();
        
        // Log audit trail
        await logRoleCreation(role, req.user, req);
        
        res.status(201).json(role);
    } catch (err) {
        logger.error('Error creating role:', err);
        
        // Log failed operation
        await logRoleOperationFailure('created', err, req.user, req, {
            attemptedName: req.body.name,
            attemptedDisplayName: req.body.displayName
        });
        
        res.status(400).json({ error: err.message });
    }
};

// Update role with system role protection
export const updateRole = async (req, res) => {
    try {
        const { displayName, description, permissions } = req.body;
        
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('✏️ Updating role for tenant:', tenantId);
        
        // Build query with tenant filtering
        const query = {
            _id: req.params.id,
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        const role = await Role.findOne(query);
        
        if (!role) {
            console.log(`❌ Role not found for update with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ error: 'Role not found' });
        }
        
        console.log(`✓ Found role ${role.name} for update for tenant ${tenantId}`);
        
        // Prevent modification of system role core properties
        if (role.isSystemRole && req.body.name) {
            return res.status(403).json({ 
                error: 'Cannot modify the name of a system role' 
            });
        }
        
        if (role.isSystemRole && req.body.isSystemRole === false) {
            return res.status(403).json({ 
                error: 'Cannot change system role flag' 
            });
        }
        
        // Validate permissions using validation utility
        if (permissions) {
            const validation = validatePermissions(permissions);
            if (!validation.valid) {
                return res.status(400).json({ 
                    error: 'Permission validation failed',
                    message: validation.errors.join('; '),
                    details: { 
                        errors: validation.errors,
                        invalidPermissions: validation.invalidPermissions,
                        validPermissions: Object.keys(PERMISSIONS)
                    }
                });
            }
        }
        
        // Store old values for audit
        const oldValues = {
            displayName: role.displayName,
            description: role.description,
            permissions: [...role.permissions]
        };
        
        // Update role
        if (displayName) role.displayName = displayName;
        if (description !== undefined) role.description = description;
        if (permissions) role.permissions = permissions;
        role.updatedBy = req.user._id;
        
        await role.save();
        
        // Log audit trail with old and new values
        const newValues = {
            displayName: role.displayName,
            description: role.description,
            permissions: role.permissions
        };
        await logRoleUpdate(role, oldValues, newValues, req.user, req);
        
        res.status(200).json(role);
    } catch (err) {
        logger.error('Error updating role:', err);
        
        // Log failed operation
        await logRoleOperationFailure('updated', err, req.user, req, {
            roleId: req.params.id
        });
        
        res.status(400).json({ error: err.message });
    }
};

// Delete role with user assignment checking and system role protection
export const deleteRole = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('🗑️ Deleting role for tenant:', tenantId);
        
        // Build query with tenant filtering
        const query = {
            _id: req.params.id,
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        const role = await Role.findOne(query);
        
        if (!role) {
            console.log(`❌ Role not found for deletion with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ error: 'Role not found' });
        }
        
        console.log(`✓ Found role ${role.name} for deletion for tenant ${tenantId}`);
        
        // Prevent deletion of system roles
        if (role.isSystemRole) {
            return res.status(403).json({ 
                error: 'Cannot delete system roles' 
            });
        }
        
        // Check if any users are assigned to this role within the same tenant
        const usersWithRole = await User.countDocuments({ 
            role: role.name, 
            tenantId: tenantId 
        });
        
        if (usersWithRole > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete role with assigned users',
                details: { userCount: usersWithRole }
            });
        }
        
        // Store role data for audit
        const roleData = {
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            permissions: role.permissions
        };
        
        await Role.findByIdAndDelete(req.params.id);
        
        // Log audit trail with complete role data
        await logRoleDeletion({
            _id: role._id,
            ...roleData
        }, req.user, req);
        
        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (err) {
        logger.error('Error deleting role:', err);
        
        // Log failed operation
        await logRoleOperationFailure('deleted', err, req.user, req, {
            roleId: req.params.id
        });
        
        res.status(500).json({ error: err.message });
    }
};

// Get role statistics for dashboard
export const getRoleStats = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('📊 Getting role stats for tenant:', tenantId);
        
        // Build tenant-aware queries
        const tenantRoleQuery = {
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        const totalRoles = await Role.countDocuments(tenantRoleQuery);
        const systemRoles = await Role.countDocuments({ isSystemRole: true });
        const customRoles = await Role.countDocuments({ tenantId: tenantId, isSystemRole: false });
        
        // Get user counts per role (tenant-scoped)
        const roles = await Role.find(tenantRoleQuery, 'name displayName tenantId isSystemRole');
        const roleUserCounts = await Promise.all(
            roles.map(async (role) => {
                const count = await User.countDocuments({ 
                    role: role.name, 
                    tenantId: tenantId 
                });
                return {
                    roleId: role._id,
                    roleName: role.name,
                    displayName: role.displayName,
                    userCount: count,
                    isSystemRole: role.isSystemRole
                };
            })
        );
        
        console.log(`✓ Role stats for tenant ${tenantId}: ${totalRoles} total, ${systemRoles} system, ${customRoles} custom`);
        
        res.status(200).json({
            totalRoles,
            systemRoles,
            customRoles,
            roleUserCounts
        });
    } catch (err) {
        logger.error('Error fetching role stats:', err);
        res.status(500).json({ error: err.message });
    }
};

// Sync system roles from permission.system.js to database
export const syncSystemRoles = async (req, res) => {
    try {
        let created = 0;
        let updated = 0;
        
        // Iterate through ROLE_PERMISSIONS
        for (const [roleName, permissions] of Object.entries(ROLE_PERMISSIONS)) {
            const existingRole = await Role.findByName(roleName);
            
            if (existingRole) {
                // Update existing system role
                existingRole.permissions = permissions;
                existingRole.isSystemRole = true;
                existingRole.updatedBy = req.user._id;
                await existingRole.save();
                updated++;
            } else {
                // Create new system role
                const newRole = new Role({
                    name: roleName,
                    displayName: roleName.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' '),
                    description: `System role: ${roleName}`,
                    permissions,
                    isSystemRole: true,
                    createdBy: req.user._id,
                    updatedBy: req.user._id
                });
                await newRole.save();
                created++;
            }
        }
        
        // Log audit trail for sync operation
        await logRolesSync({ created, updated }, req.user, req);
        
        res.status(200).json({
            message: 'System roles synced successfully',
            created,
            updated
        });
    } catch (err) {
        logger.error('Error syncing system roles:', err);
        
        // Log failed operation
        await logRoleOperationFailure('synced', err, req.user, req);
        
        res.status(500).json({ error: err.message });
    }
};

// Get all available permissions and categories
export const getAllPermissions = async (req, res) => {
    try {
        res.status(200).json({
            permissions: PERMISSIONS,
            categories: PERMISSION_CATEGORIES
        });
    } catch (err) {
        logger.error('Error fetching permissions:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get role audit logs
export const getRoleAuditLogs = async (req, res) => {
    try {
        const {
            limit = 100,
            skip = 0,
            startDate,
            endDate,
            eventType,
            roleId,
            roleName
        } = req.query;

        const { getRoleAuditLogs: queryAuditLogs } = await import('../utils/roleAuditQuery.js');
        
        const result = await queryAuditLogs({
            limit: parseInt(limit),
            skip: parseInt(skip),
            startDate,
            endDate,
            eventType,
            roleId,
            roleName,
            userId: req.query.userId
        });

        res.status(200).json(result);
    } catch (err) {
        logger.error('Error fetching role audit logs:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get audit history for a specific role
export const getRoleAuditHistory = async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;
        
        const { getRoleAuditHistory: queryAuditHistory } = await import('../utils/roleAuditQuery.js');
        
        const logs = await queryAuditHistory(req.params.id, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        res.status(200).json(logs);
    } catch (err) {
        logger.error('Error fetching role audit history:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get role audit statistics
export const getRoleAuditStats = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const { getRoleAuditStats: queryAuditStats } = await import('../utils/roleAuditQuery.js');
        
        const stats = await queryAuditStats(parseInt(days));

        res.status(200).json(stats);
    } catch (err) {
        logger.error('Error fetching role audit stats:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get user count for a specific role
export const getRoleUserCount = async (req, res) => {
    try {
        // Get tenant context
        const tenantId = req.tenantId || req.user?.tenantId;
        
        console.log('👥 Getting user count for role for tenant:', tenantId);
        
        // Build query with tenant filtering
        const query = {
            _id: req.params.id,
            $or: [
                { isSystemRole: true }, // System roles are available to all tenants
                { tenantId: tenantId, isSystemRole: false } // Custom roles for this tenant only
            ]
        };
        
        const role = await Role.findOne(query);
        
        if (!role) {
            console.log(`❌ Role not found for user count with ID ${req.params.id} for tenant ${tenantId}`);
            return res.status(404).json({ error: 'Role not found' });
        }
        
        console.log(`✓ Found role ${role.name} for user count for tenant ${tenantId}`);
        
        // Count users assigned to this role within the same tenant
        const userCount = await User.countDocuments({ 
            role: role.name, 
            tenantId: tenantId 
        });
        
        // Get sample users (up to 5) for display within the same tenant
        const sampleUsers = await User.find({ 
            role: role.name, 
            tenantId: tenantId 
        })
            .select('username email personalInfo.fullName')
            .limit(5);
        
        res.status(200).json({
            roleId: role._id,
            roleName: role.name,
            displayName: role.displayName,
            userCount,
            sampleUsers: sampleUsers.map(user => ({
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.personalInfo?.fullName || user.username
            }))
        });
    } catch (err) {
        logger.error('Error fetching role user count:', err);
        res.status(500).json({ error: err.message });
    }
};
