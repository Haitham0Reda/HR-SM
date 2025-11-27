/**
 * Migration script to sync system roles from permission.system.js to database
 * 
 * This script:
 * 1. Reads system roles from ROLE_PERMISSIONS in permission.system.js
 * 2. Creates or updates roles in the database
 * 3. Sets isSystemRole flag to true for all predefined roles
 * 4. Preserves any custom roles that already exist
 * 
 * Usage: node server/scripts/syncSystemRoles.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.model.js';
import { ROLE_PERMISSIONS, PERMISSIONS } from '../models/permission.system.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-system';

// Role display names and descriptions
const ROLE_METADATA = {
    'admin': {
        displayName: 'Administrator',
        description: 'Full system access with all permissions'
    },
    'hr': {
        displayName: 'Human Resources',
        description: 'HR management functions including user management, payroll, and employee records'
    },
    'manager': {
        displayName: 'Manager',
        description: 'Team and department management with approval capabilities'
    },
    'employee': {
        displayName: 'Employee',
        description: 'Basic access to own data and general information'
    },
    'id-card-admin': {
        displayName: 'ID Card Administrator',
        description: 'ID card operations and batch printing'
    },
    'supervisor': {
        displayName: 'Supervisor',
        description: 'Team supervision with approval capabilities'
    },
    'head-of-department': {
        displayName: 'Head of Department',
        description: 'Department-level management and oversight'
    },
    'dean': {
        displayName: 'Dean',
        description: 'School-level management and administration'
    }
};

async function syncSystemRoles() {
    try {
        console.log('Starting system roles synchronization...');
        console.log('Connecting to MongoDB...');
        
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        const systemRoles = Object.keys(ROLE_PERMISSIONS);
        console.log(`\nFound ${systemRoles.length} system roles to sync:`);
        systemRoles.forEach(role => console.log(`  - ${role}`));

        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (const roleName of systemRoles) {
            const permissions = ROLE_PERMISSIONS[roleName];
            const metadata = ROLE_METADATA[roleName] || {
                displayName: roleName.charAt(0).toUpperCase() + roleName.slice(1),
                description: `System role: ${roleName}`
            };

            // Validate permissions
            const invalidPermissions = permissions.filter(p => !PERMISSIONS[p]);
            if (invalidPermissions.length > 0) {
                console.warn(`\n⚠ Warning: Role "${roleName}" has invalid permissions:`, invalidPermissions);
            }

            // Check if role already exists
            const existingRole = await Role.findByName(roleName);

            if (existingRole) {
                // Update existing role
                const hasChanges = 
                    existingRole.displayName !== metadata.displayName ||
                    existingRole.description !== metadata.description ||
                    JSON.stringify(existingRole.permissions.sort()) !== JSON.stringify(permissions.sort()) ||
                    existingRole.isSystemRole !== true;

                if (hasChanges) {
                    existingRole.displayName = metadata.displayName;
                    existingRole.description = metadata.description;
                    existingRole.permissions = permissions;
                    existingRole.isSystemRole = true;
                    
                    await existingRole.save();
                    console.log(`\n✓ Updated role: ${roleName}`);
                    console.log(`  Display Name: ${metadata.displayName}`);
                    console.log(`  Permissions: ${permissions.length}`);
                    updated++;
                } else {
                    console.log(`\n- Skipped role (no changes): ${roleName}`);
                    skipped++;
                }
            } else {
                // Create new role
                const newRole = new Role({
                    name: roleName,
                    displayName: metadata.displayName,
                    description: metadata.description,
                    permissions: permissions,
                    isSystemRole: true
                });

                await newRole.save();
                console.log(`\n✓ Created role: ${roleName}`);
                console.log(`  Display Name: ${metadata.displayName}`);
                console.log(`  Permissions: ${permissions.length}`);
                created++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('System roles synchronization completed!');
        console.log('='.repeat(60));
        console.log(`Created: ${created}`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Total: ${systemRoles.length}`);
        console.log('='.repeat(60));

        // Display summary of all roles in database
        const allRoles = await Role.find().sort({ isSystemRole: -1, name: 1 });
        console.log(`\nTotal roles in database: ${allRoles.length}`);
        console.log(`System roles: ${allRoles.filter(r => r.isSystemRole).length}`);
        console.log(`Custom roles: ${allRoles.filter(r => !r.isSystemRole).length}`);

        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Migration failed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the migration
syncSystemRoles();
