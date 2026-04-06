/**
 * Update TechCorp tenant subscription to enable insurance reports
 * TODO: Convert to PostgreSQL/Sequelize
 */

import dotenv from 'dotenv';

dotenv.config();

async function updateTenantSubscription() {
    try {
        console.log('⚠️  This script needs to be converted to PostgreSQL/Sequelize');
        console.log('MongoDB-specific functionality has been removed');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

updateTenantSubscription();
