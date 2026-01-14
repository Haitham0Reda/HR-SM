/**
 * Update TechCorp tenant subscription to enable insurance reports
 */

import mongoose from 'mongoose';
import TenantConfig from './modules/hr-core/models/TenantConfig.js';
import dotenv from 'dotenv';

dotenv.config();

async function updateTenantSubscription() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-system');
        console.log('✓ Connected to MongoDB');

        // Find the techcorp_solutions tenant
        const tenant = await TenantConfig.findOne({ tenantId: 'techcorp_solutions' });

        if (!tenant) {
            console.log('❌ TechCorp tenant not found');
            process.exit(1);
        }

        console.log('\nCurrent tenant subscription:', {
            plan: tenant.subscription?.plan || 'none',
            status: tenant.subscription?.status || 'none'
        });

        // Update to professional plan to enable insurance reports
        tenant.subscription = {
            plan: 'professional',
            status: 'active',
            maxEmployees: 500,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
        };

        await tenant.save();

        console.log('\n✓ Tenant subscription updated to professional plan');
        console.log('✓ Insurance reports feature is now enabled');

        console.log('\nNew subscription:', {
            plan: tenant.subscription.plan,
            status: tenant.subscription.status,
            maxEmployees: tenant.subscription.maxEmployees
        });

    } catch (error) {
        console.error('Error updating tenant subscription:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    }
}

updateTenantSubscription();
