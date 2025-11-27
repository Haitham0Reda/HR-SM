/**
 * Verification script to check system roles in database
 * 
 * Usage: node server/scripts/verifySystemRoles.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-system';

async function verifySystemRoles() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        // Get all roles
        const allRoles = await Role.find().sort({ isSystemRole: -1, name: 1 });
        
        console.log('='.repeat(80));
        console.log('ROLES IN DATABASE');
        console.log('='.repeat(80));
        console.log(`Total roles: ${allRoles.length}`);
        console.log(`System roles: ${allRoles.filter(r => r.isSystemRole).length}`);
        console.log(`Custom roles: ${allRoles.filter(r => !r.isSystemRole).length}`);
        console.log('='.repeat(80));
        
        // Display each role
        for (const role of allRoles) {
            console.log(`\n${role.isSystemRole ? '🔒' : '📝'} ${role.displayName} (${role.name})`);
            console.log(`   Type: ${role.isSystemRole ? 'System Role' : 'Custom Role'}`);
            console.log(`   Description: ${role.description || 'N/A'}`);
            console.log(`   Permissions: ${role.permissions.length}`);
            console.log(`   Created: ${role.createdAt ? role.createdAt.toISOString() : 'N/A'}`);
            
            // Show first 5 permissions as sample
            if (role.permissions.length > 0) {
                const samplePerms = role.permissions.slice(0, 5);
                console.log(`   Sample permissions: ${samplePerms.join(', ')}${role.permissions.length > 5 ? '...' : ''}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✓ Verification completed');
        console.log('='.repeat(80));

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Verification failed:', error);
        process.exit(1);
    }
}

verifySystemRoles();
