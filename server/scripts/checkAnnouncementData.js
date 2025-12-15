#!/usr/bin/env node

/**
 * Script to check announcement and notification data in the database
 */

import mongoose from 'mongoose';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function checkAnnouncementData() {
    try {
        console.log('🔍 Checking announcement and notification data...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Check announcements
        console.log('\n📢 ANNOUNCEMENTS');
        console.log('═'.repeat(50));
        
        try {
            const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
            
            const announcements = await Announcement.find({}).sort({ createdAt: -1 }).limit(10);
            console.log(`Found ${announcements.length} announcements`);
            
            if (announcements.length === 0) {
                console.log('❌ No announcements found in database');
                console.log('💡 This explains why announcement data is not showing');
            } else {
                announcements.forEach((announcement, index) => {
                    console.log(`\n${index + 1}. ${announcement.title}`);
                    console.log(`   Status: ${announcement.status || 'N/A'}`);
                    console.log(`   Type: ${announcement.type || 'N/A'}`);
                    console.log(`   Created: ${announcement.createdAt}`);
                    console.log(`   Active: ${announcement.isActive ? 'Yes' : 'No'}`);
                });
            }
        } catch (error) {
            console.log(`❌ Error loading announcements: ${error.message}`);
        }

        // Check notifications
        console.log('\n\n🔔 NOTIFICATIONS');
        console.log('═'.repeat(50));
        
        try {
            const { default: Notification } = await import('../modules/notifications/models/notification.model.js');
            
            const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(10);
            console.log(`Found ${notifications.length} notifications`);
            
            if (notifications.length === 0) {
                console.log('❌ No notifications found in database');
                console.log('💡 This explains why notifications are not updating');
            } else {
                notifications.forEach((notification, index) => {
                    console.log(`\n${index + 1}. ${notification.title || notification.message}`);
                    console.log(`   Type: ${notification.type || 'N/A'}`);
                    console.log(`   Read: ${notification.isRead ? 'Yes' : 'No'}`);
                    console.log(`   Created: ${notification.createdAt}`);
                    console.log(`   Recipient: ${notification.recipient || notification.userId || 'N/A'}`);
                });
            }
        } catch (error) {
            console.log(`❌ Error loading notifications: ${error.message}`);
        }

        // Check users for context
        console.log('\n\n👥 USERS (for context)');
        console.log('═'.repeat(50));
        
        try {
            const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
            
            const users = await User.find({}).select('name email role tenantId').limit(5);
            console.log(`Found ${users.length} users`);
            
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
                console.log(`   Tenant: ${user.tenantId || 'N/A'}`);
            });
        } catch (error) {
            console.log(`❌ Error loading users: ${error.message}`);
        }

        console.log('\n\n📋 SUMMARY');
        console.log('═'.repeat(50));
        console.log('If no data is found:');
        console.log('  1. Create sample announcements and notifications');
        console.log('  2. Check frontend authentication and API calls');
        console.log('  3. Verify tenant ID matching between frontend and backend');
        console.log('\nIf data exists but not showing:');
        console.log('  1. Check frontend service authentication headers');
        console.log('  2. Verify API endpoints are being called correctly');
        console.log('  3. Check browser network tab for API call errors');

    } catch (error) {
        console.error('❌ Error checking data:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
checkAnnouncementData().catch(console.error);