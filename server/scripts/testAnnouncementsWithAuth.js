#!/usr/bin/env node

/**
 * Test announcements API with authentication to see exact response
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testAnnouncementsWithAuth() {
    try {
        console.log('🧪 Testing announcements API with authentication...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Find techcorp admin user
        const userSchema = new mongoose.Schema({
            email: String,
            tenantId: String,
            role: String,
            name: String
        });
        const User = mongoose.model('User', userSchema);

        const techcorpUser = await User.findOne({ email: 'admin@techcorp.com' });
        
        if (!techcorpUser) {
            console.log('❌ TechCorp admin user not found');
            return;
        }

        console.log(`👤 Found user: ${techcorpUser.email}`);
        console.log(`🏢 Tenant ID: ${techcorpUser.tenantId}`);
        console.log(`👑 Role: ${techcorpUser.role}`);

        // Create a JWT token for this user
        const token = jwt.sign(
            { 
                id: techcorpUser._id,
                email: techcorpUser.email,
                tenantId: techcorpUser.tenantId,
                role: techcorpUser.role
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '1h' }
        );

        console.log(`🔑 Generated token for testing`);

        // Test announcements API
        console.log('\n📢 Testing /announcements API...');
        
        const response = await fetch(`${API_BASE_URL}/announcements`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Response status: ${response.status} ${response.statusText}`);

        if (response.status === 200) {
            const data = await response.json();
            console.log(`✅ Success! Received ${Array.isArray(data) ? data.length : 'non-array'} items`);
            
            if (Array.isArray(data)) {
                console.log('\n📋 Announcements received:');
                data.forEach((ann, index) => {
                    console.log(`${index + 1}. "${ann.title}"`);
                    console.log(`   Type: ${ann.type}`);
                    console.log(`   Target: ${ann.targetAudience}`);
                    console.log(`   Active: ${ann.isActive}`);
                    console.log(`   Created by: ${ann.createdBy}`);
                });
                
                if (data.length === 0) {
                    console.log('⚠️  Empty array returned - this explains why frontend shows no data');
                }
            } else {
                console.log('⚠️  Response is not an array:', typeof data);
                console.log('📄 Response:', JSON.stringify(data, null, 2));
            }
        } else {
            const errorText = await response.text();
            console.log(`❌ Error response: ${errorText}`);
        }

        // Also test /announcements/active
        console.log('\n📢 Testing /announcements/active API...');
        
        const activeResponse = await fetch(`${API_BASE_URL}/announcements/active`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Active response status: ${activeResponse.status} ${activeResponse.statusText}`);

        if (activeResponse.status === 200) {
            const activeData = await activeResponse.json();
            console.log(`✅ Active announcements: ${Array.isArray(activeData) ? activeData.length : 'non-array'} items`);
            
            if (Array.isArray(activeData) && activeData.length > 0) {
                console.log('\n📋 Active announcements:');
                activeData.forEach((ann, index) => {
                    console.log(`${index + 1}. "${ann.title}"`);
                });
            }
        }

        // Check what users are in the same tenant
        console.log('\n👥 Checking tenant users...');
        const tenantUsers = await User.find({ tenantId: techcorpUser.tenantId });
        console.log(`📊 Users in tenant ${techcorpUser.tenantId}: ${tenantUsers.length}`);
        tenantUsers.forEach(user => {
            console.log(`   - ${user.email} (${user.role})`);
        });

        // Check announcements created by tenant users
        console.log('\n📢 Checking announcements by tenant users...');
        const announcementSchema = new mongoose.Schema({
            title: String,
            type: String,
            targetAudience: String,
            isActive: Boolean,
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        });
        const Announcement = mongoose.model('Announcement', announcementSchema);

        const tenantUserIds = tenantUsers.map(u => u._id);
        const tenantAnnouncements = await Announcement.find({ 
            createdBy: { $in: tenantUserIds } 
        });
        
        console.log(`📊 Announcements by tenant users: ${tenantAnnouncements.length}`);
        if (tenantAnnouncements.length > 0) {
            tenantAnnouncements.forEach((ann, index) => {
                console.log(`${index + 1}. "${ann.title}" (createdBy: ${ann.createdBy})`);
            });
        }

    } catch (error) {
        console.error('❌ Error testing announcements:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

testAnnouncementsWithAuth().catch(console.error);