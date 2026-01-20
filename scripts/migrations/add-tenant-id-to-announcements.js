#!/usr/bin/env node

/**
 * Migration Script: Add tenantId to existing announcements
 * 
 * This script adds tenantId field to existing announcements that don't have it.
 * Run this after updating the announcement model to include tenantId.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_system';

async function migrateAnnouncements() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get the announcements collection directly
        const db = mongoose.connection.db;
        const announcementsCollection = db.collection('announcements');

        // Find announcements without tenantId
        const announcementsWithoutTenantId = await announcementsCollection.find({
            tenantId: { $exists: false }
        }).toArray();

        console.log(`📊 Found ${announcementsWithoutTenantId.length} announcements without tenantId`);

        if (announcementsWithoutTenantId.length === 0) {
            console.log('✅ All announcements already have tenantId. No migration needed.');
            return;
        }

        // Get available tenants
        const tenantsCollection = db.collection('tenants');
        const tenants = await tenantsCollection.find({}).toArray();

        if (tenants.length === 0) {
            console.log('⚠️  No tenants found. Creating default tenant...');

            // Create a default tenant
            const defaultTenant = {
                _id: new mongoose.Types.ObjectId(),
                name: 'Default Company',
                code: 'default',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await tenantsCollection.insertOne(defaultTenant);
            console.log('✅ Created default tenant');

            // Use the default tenant for all announcements
            const result = await announcementsCollection.updateMany(
                { tenantId: { $exists: false } },
                { $set: { tenantId: defaultTenant.code } }
            );

            console.log(`✅ Updated ${result.modifiedCount} announcements with default tenantId`);
        } else {
            // If there's only one tenant, assign all announcements to it
            if (tenants.length === 1) {
                const tenant = tenants[0];
                const result = await announcementsCollection.updateMany(
                    { tenantId: { $exists: false } },
                    { $set: { tenantId: tenant.code || tenant._id.toString() } }
                );

                console.log(`✅ Updated ${result.modifiedCount} announcements with tenantId: ${tenant.code || tenant._id}`);
            } else {
                // Multiple tenants - need manual assignment
                console.log('⚠️  Multiple tenants found. Manual assignment required.');
                console.log('Available tenants:');
                tenants.forEach((tenant, index) => {
                    console.log(`  ${index + 1}. ${tenant.name} (${tenant.code || tenant._id})`);
                });

                console.log('\n📝 Please manually assign announcements to tenants or run this script with specific tenant assignment logic.');

                // For now, assign to the first tenant as a fallback
                const firstTenant = tenants[0];
                const result = await announcementsCollection.updateMany(
                    { tenantId: { $exists: false } },
                    { $set: { tenantId: firstTenant.code || firstTenant._id.toString() } }
                );

                console.log(`✅ Temporarily assigned ${result.modifiedCount} announcements to first tenant: ${firstTenant.name}`);
                console.log('⚠️  Review and reassign as needed.');
            }
        }

        console.log('✅ Migration completed successfully');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateAnnouncements()
        .then(() => {
            console.log('🎉 Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

export default migrateAnnouncements;