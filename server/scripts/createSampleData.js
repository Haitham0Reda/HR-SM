#!/usr/bin/env node

/**
 * Script to create sample announcements and notifications for testing
 */

import mongoose from 'mongoose';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function createSampleData() {
    try {
        console.log('🔧 Creating sample announcements and notifications...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get a user to associate with the data
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const users = await User.find({}).limit(3);
        
        if (users.length === 0) {
            console.log('❌ No users found in database');
            return;
        }

        console.log(`👥 Found ${users.length} users`);
        const adminUser = users.find(u => u.role === 'admin') || users[0];
        console.log(`👤 Using user: ${adminUser.name || adminUser.email} (${adminUser.role})`);
        console.log(`🏢 Tenant ID: ${adminUser.tenantId}`);

        // Create sample announcements
        console.log('\n📢 Creating sample announcements...');
        
        try {
            const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
            
            // Clear existing announcements for this tenant
            await Announcement.deleteMany({});
            
            const sampleAnnouncements = [
                {
                    title: 'Welcome to the New HR System',
                    content: 'We are excited to announce the launch of our new HR management system. This platform will help streamline all HR processes.',
                    type: 'general',
                    priority: 'high',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    createdBy: adminUser._id
                },
                {
                    title: 'Holiday Schedule Update',
                    content: 'Please note the updated holiday schedule for the upcoming quarter. Check the calendar for specific dates.',
                    type: 'policy',
                    priority: 'medium',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                    createdBy: adminUser._id
                },
                {
                    title: 'System Maintenance Notice',
                    content: 'Scheduled system maintenance will occur this weekend. Please save your work before Friday evening.',
                    type: 'maintenance',
                    priority: 'high',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                    createdBy: adminUser._id
                }
            ];

            const createdAnnouncements = await Announcement.insertMany(sampleAnnouncements);
            console.log(`✅ Created ${createdAnnouncements.length} announcements`);

        } catch (error) {
            console.log(`❌ Error creating announcements: ${error.message}`);
        }

        // Create sample notifications
        console.log('\n🔔 Creating sample notifications...');
        
        try {
            const { default: Notification } = await import('../modules/notifications/models/notification.model.js');
            
            // Clear existing notifications for this tenant
            await Notification.deleteMany({});
            
            const sampleNotifications = [];
            
            // Create notifications for each user
            for (const user of users) {
                if (user.tenantId === adminUser.tenantId) {
                    sampleNotifications.push(
                        {
                            title: 'Welcome to HR System',
                            message: 'Your account has been set up successfully. Please complete your profile.',
                            type: 'custom',
                            recipient: user._id,
                            isRead: false
                        },
                        {
                            title: 'New Announcement Posted',
                            message: 'A new company announcement has been posted. Please check the announcements section.',
                            type: 'announcement',
                            recipient: user._id,
                            isRead: false
                        }
                    );
                }
            }

            if (sampleNotifications.length > 0) {
                const createdNotifications = await Notification.insertMany(sampleNotifications);
                console.log(`✅ Created ${createdNotifications.length} notifications`);
            } else {
                console.log('⚠️  No notifications created (no matching tenant users)');
            }

        } catch (error) {
            console.log(`❌ Error creating notifications: ${error.message}`);
        }

        // Verify the data
        console.log('\n🔍 Verifying created data...');
        
        try {
            const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
            const { default: Notification } = await import('../modules/notifications/models/notification.model.js');
            
            const announcementCount = await Announcement.countDocuments({});
            const notificationCount = await Notification.countDocuments({});
            
            console.log(`📢 Announcements in database: ${announcementCount}`);
            console.log(`🔔 Notifications in database: ${notificationCount}`);
            
            if (announcementCount > 0 && notificationCount > 0) {
                console.log('\n🎉 Sample data created successfully!');
                console.log('💡 Now test the frontend to see if data appears');
            }
            
        } catch (error) {
            console.log(`❌ Error verifying data: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error creating sample data:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

// Run the script
createSampleData().catch(console.error);