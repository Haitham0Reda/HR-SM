#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import multiTenantDB from './config/multiTenant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkUserRole() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get tenant-specific database connection
        const tenantConnection = await multiTenantDB.getCompanyConnection('techcorp_solutions');
        
        // Find the admin user using mongoose model
        const User = tenantConnection.model('User', new mongoose.Schema({
            email: String,
            role: String,
            status: String,
            tenantId: String,
            firstName: String,
            lastName: String
        }));
        
        const users = await User.find({
            email: 'admin@techcorp.com'
        }).lean();

        console.log('\n👤 User details:');
        users.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Status: ${user.status}`);
            console.log(`Tenant ID: ${user.tenantId}`);
            console.log(`First Name: ${user.firstName || 'N/A'}`);
            console.log(`Last Name: ${user.lastName || 'N/A'}`);
            console.log('');
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkUserRole();