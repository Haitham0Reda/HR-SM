#!/usr/bin/env node

/**
 * Script to debug announcements issue specifically
 */

import mongoose from 'mongoose';
import fetch from 'node-fetch';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function debugAnnouncementsIssue() {
    try {
        console.log('🔍 Debugging announcements issue...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Check announcements in database
        console.log('\n📢 CHECKING DATABASE ANNOUNCEMENTS');
        console.log('═'.repeat(60));
        
        const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
        
        // Get all announcements
        const allAnnouncements = await Announcement.find({}).populate('createdBy', 'name email tenantId');
        console.log(`📊 Total announcements in database: ${allAnnouncements.length}`);
        
        if (allAnnouncements.length > 0) {
            console.log('\n📋 All announcements:');
            allAnnouncements.forEach((ann, index) => {
                console.log(`${index + 1}. "${ann.title}"`);
                console.log(`   Type: ${ann.type}`);
                console.log(`   Active: ${ann.isActive}`);
                console.log(`   Created by: ${ann.createdBy?.email || 'Unknown'}`);
                console.log(`   Creator tenant: ${ann.createdBy?.tenantId || 'Unknown'}`);
                console.log(`   Created at: ${ann.createdAt}`);
                console.log('');
            });
        }

        // Check techcorp user
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const techcorpUser = await User.findOne({ email: 'admin@techcorp.com' });
        
        if (techcorpUser) {
            console.log(`👤 TechCorp user found:`);
            console.log(`   Email: ${techcorpUser.email}`);
            console.log(`   Tenant ID: ${techcorpUser.tenantId}`);
            console.log(`   Role: ${techcorpUser.role}`);
        } else {
            console.log('❌ TechCorp user not found');
        }

        // Test announcements API directly
        console.log('\n🧪 TESTING ANNOUNCEMENTS API');
        console.log('═'.repeat(60));
        
        try {
            // Test without auth (should get 401)
            console.log('1. Testing without authentication...');
            const response1 = await fetch(`${API_BASE_URL}/announcements`);
            console.log(`   Status: ${response1.status} ${response1.statusText}`);
            
            if (response1.status === 401) {
                console.log('   ✅ API route is working (requires auth)');
            } else {
                console.log('   ❌ Unexpected response');
                const text = await response1.text();
                console.log(`   Response: ${text.substring(0, 200)}`);
            }
        } catch (error) {
            console.log(`   ❌ API test failed: ${error.message}`);
        }

        // Check announcements controller
        console.log('\n🔍 CHECKING ANNOUNCEMENTS CONTROLLER');
        console.log('═'.repeat(60));
        
        try {
            const { getAllAnnouncements } = await import('../modules/announcements/controllers/announcement.controller.js');
            console.log('✅ Announcements controller loaded successfully');
        } catch (error) {
            console.log(`❌ Error loading announcements controller: ${error.message}`);
        }

        // Check if announcements are filtered by tenant
        console.log('\n🔍 CHECKING TENANT FILTERING');
        console.log('═'.repeat(60));
        
        if (techcorpUser) {
            // Check announcements created by techcorp users
            const techcorpUsers = await User.find({ tenantId: techcorpUser.tenantId });
            const techcorpUserIds = techcorpUsers.map(u => u._id);
            
            const techcorpAnnouncements = await Announcement.find({ 
                createdBy: { $in: techcorpUserIds } 
            });
            
            console.log(`📊 TechCorp users: ${techcorpUsers.length}`);
            console.log(`📊 Announcements by TechCorp users: ${techcorpAnnouncements.length}`);
            
            if (techcorpAnnouncements.length > 0) {
                console.log('\n📋 TechCorp announcements:');
                techcorpAnnouncements.forEach((ann, index) => {
                    console.log(`${index + 1}. "${ann.title}"`);
                    console.log(`   Type: ${ann.type}`);
                    console.log(`   Active: ${ann.isActive}`);
                    console.log(`   Created: ${ann.createdAt}`);
                });
            } else {
                console.log('❌ No announcements found for TechCorp users');
                console.log('💡 This explains why the API returns empty array');
            }
        }

        console.log('\n📋 SUMMARY');
        console.log('═'.repeat(60));
        console.log('Possible issues:');
        console.log('1. Announcements API filtering by tenant/user');
        console.log('2. Frontend not calling the API correctly');
        console.log('3. Data created for wrong users/tenant');
        console.log('4. Controller logic filtering out data');
        
        console.log('\nNext steps:');
        console.log('1. Check browser console for API call logs');
        console.log('2. Check Network tab for actual API responses');
        console.log('3. Verify announcements controller logic');

    } catch (error) {
        console.error('❌ Error debugging announcements:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
debugAnnouncementsIssue().catch(console.error);