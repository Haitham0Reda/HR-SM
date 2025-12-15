#!/usr/bin/env node

/**
 * Script to create sample data for the correct tenant (techcorp.com users)
 */

import mongoose from 'mongoose';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function createSampleDataForCorrectTenant() {
    try {
        console.log('🔧 Creating sample data for techcorp.com users...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Get techcorp users
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const techcorpUsers = await User.find({ 
            email: { $regex: /@techcorp\.com$/ } 
        });
        
        if (techcorpUsers.length === 0) {
            console.log('❌ No techcorp.com users found');
            return;
        }

        console.log(`👥 Found ${techcorpUsers.length} techcorp.com users`);
        const adminUser = techcorpUsers.find(u => u.role === 'admin') || techcorpUsers[0];
        console.log(`👤 Using user: ${adminUser.name || adminUser.email} (${adminUser.role})`);
        console.log(`🏢 Tenant ID: ${adminUser.tenantId}`);

        // Create sample announcements for techcorp tenant
        console.log('\n📢 Creating announcements for techcorp tenant...');
        
        try {
            const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
            
            // Clear existing announcements for techcorp tenant
            await Announcement.deleteMany({ createdBy: { $in: techcorpUsers.map(u => u._id) } });
            
            const sampleAnnouncements = [
                {
                    title: 'Welcome to TechCorp HR System',
                    content: 'Welcome to TechCorp Solutions! We are excited to have you on our new HR management platform. This system will help streamline all our HR processes and improve communication across the company.',
                    type: 'general',
                    priority: 'high',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    createdBy: adminUser._id
                },
                {
                    title: 'Q1 2026 Holiday Schedule',
                    content: 'Please review the updated holiday schedule for Q1 2026. All company holidays are marked in the calendar. Plan your vacation requests accordingly.',
                    type: 'policy',
                    priority: 'medium',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                    createdBy: adminUser._id
                },
                {
                    title: 'System Maintenance - Weekend',
                    content: 'Scheduled system maintenance will occur this weekend from Saturday 6 PM to Sunday 8 AM. Please save your work and log out before Saturday evening.',
                    type: 'maintenance',
                    priority: 'high',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                    createdBy: adminUser._id
                },
                {
                    title: 'New Employee Onboarding Process',
                    content: 'We have updated our employee onboarding process. All new hires will now go through a comprehensive 3-day orientation program.',
                    type: 'policy',
                    priority: 'medium',
                    targetAudience: 'all',
                    isActive: true,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
                    createdBy: adminUser._id
                }
            ];

            const createdAnnouncements = await Announcement.insertMany(sampleAnnouncements);
            console.log(`✅ Created ${createdAnnouncements.length} announcements for techcorp tenant`);

        } catch (error) {
            console.log(`❌ Error creating announcements: ${error.message}`);
        }

        // Create sample notifications for techcorp users
        console.log('\n🔔 Creating notifications for techcorp users...');
        
        try {
            const { default: Notification } = await import('../modules/notifications/models/notification.model.js');
            
            // Clear existing notifications for techcorp users
            await Notification.deleteMany({ recipient: { $in: techcorpUsers.map(u => u._id) } });
            
            const sampleNotifications = [];
            
            // Create notifications for each techcorp user
            for (const user of techcorpUsers) {
                sampleNotifications.push(
                    {
                        title: 'Welcome to TechCorp HR System',
                        message: 'Your TechCorp HR account has been set up successfully. Please complete your profile and review company policies.',
                        type: 'custom',
                        recipient: user._id,
                        isRead: false
                    },
                    {
                        title: 'New Company Announcements',
                        message: 'New company announcements have been posted. Please check the announcements section for important updates.',
                        type: 'announcement',
                        recipient: user._id,
                        isRead: false
                    },
                    {
                        title: 'Profile Completion Required',
                        message: 'Please complete your employee profile including emergency contacts and banking information.',
                        type: 'custom',
                        recipient: user._id,
                        isRead: false
                    }
                );
            }

            if (sampleNotifications.length > 0) {
                const createdNotifications = await Notification.insertMany(sampleNotifications);
                console.log(`✅ Created ${createdNotifications.length} notifications for techcorp users`);
            }

        } catch (error) {
            console.log(`❌ Error creating notifications: ${error.message}`);
        }

        // Verify the data
        console.log('\n🔍 Verifying created data...');
        
        try {
            const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');
            const { default: Notification } = await import('../modules/notifications/models/notification.model.js');
            
            const announcementCount = await Announcement.countDocuments({ 
                createdBy: { $in: techcorpUsers.map(u => u._id) } 
            });
            const notificationCount = await Notification.countDocuments({ 
                recipient: { $in: techcorpUsers.map(u => u._id) } 
            });
            
            console.log(`📢 Announcements for techcorp: ${announcementCount}`);
            console.log(`🔔 Notifications for techcorp users: ${notificationCount}`);
            
            if (announcementCount > 0 && notificationCount > 0) {
                console.log('\n🎉 Sample data created successfully for techcorp tenant!');
                console.log('💡 Now refresh the frontend to see the data');
                console.log(`🏢 Tenant ID: ${adminUser.tenantId}`);
                console.log(`👤 User: ${adminUser.email}`);
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
createSampleDataForCorrectTenant().catch(console.error);