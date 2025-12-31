#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:5000/api/v1';

async function createSampleNotifications() {
    try {
        console.log('🔔 Creating sample notifications...\n');

        // Test login
        console.log('1. Logging in...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            email: 'admin@techcorp.com',
            password: 'admin123',
            tenantId: 'techcorp_solutions'
        });

        if (!loginResponse.data.success) {
            console.log('❌ Login failed');
            return;
        }

        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        const userId = user._id;
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        console.log('✅ Login successful');

        // Sample notifications to create
        const sampleNotifications = [
            {
                recipient: userId,
                title: 'Welcome to HR-SM',
                message: 'Welcome to the HR System Management platform. You can manage all HR operations from here.',
                type: 'info',
                priority: 'normal'
            },
            {
                recipient: userId,
                title: 'Leave Request Approved',
                message: 'Your vacation leave request for next week has been approved by your manager.',
                type: 'success',
                priority: 'normal'
            },
            {
                recipient: userId,
                title: 'System Maintenance',
                message: 'Scheduled system maintenance will occur this weekend from 2 AM to 4 AM.',
                type: 'warning',
                priority: 'high'
            },
            {
                recipient: userId,
                title: 'New Task Assigned',
                message: 'You have been assigned a new task: "Complete Q4 Performance Reviews"',
                type: 'task',
                priority: 'normal'
            },
            {
                recipient: userId,
                title: 'Monthly Report Due',
                message: 'Your monthly attendance report is due by the end of this week.',
                type: 'announcement',
                priority: 'high'
            }
        ];

        console.log('\n2. Creating sample notifications...');
        let createdCount = 0;

        for (const notification of sampleNotifications) {
            try {
                const response = await axios.post(`${API_BASE}/notifications`, notification, { headers });
                if (response.data.success) {
                    console.log(`✅ Created: "${notification.title}"`);
                    createdCount++;
                } else {
                    console.log(`❌ Failed to create: "${notification.title}"`);
                }
            } catch (error) {
                console.log(`❌ Error creating "${notification.title}": ${error.response?.data?.message || error.message}`);
            }
        }

        console.log(`\n3. Summary:`);
        console.log(`✅ Successfully created ${createdCount} out of ${sampleNotifications.length} notifications`);

        // Get all notifications to verify
        console.log('\n4. Verifying created notifications...');
        try {
            const response = await axios.get(`${API_BASE}/notifications`, { headers });
            if (response.data.success) {
                console.log(`📊 Total notifications in system: ${response.data.data.length}`);
                
                if (response.data.data.length > 0) {
                    console.log('\n📋 Recent notifications:');
                    response.data.data.slice(0, 3).forEach((notif, index) => {
                        console.log(`   ${index + 1}. ${notif.title} (${notif.type}, ${notif.priority})`);
                    });
                }
            }
        } catch (error) {
            console.log(`❌ Error fetching notifications: ${error.message}`);
        }

        console.log('\n🎉 Sample notifications created successfully!');
        console.log('📱 You can now test the notification functionality in the frontend application.');

    } catch (error) {
        if (error.response) {
            console.log(`❌ Script failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.log(`❌ Script failed: ${error.message}`);
        }
    }
}

createSampleNotifications();