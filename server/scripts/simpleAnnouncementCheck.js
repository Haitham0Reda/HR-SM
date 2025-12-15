#!/usr/bin/env node

/**
 * Simple script to check announcements without complex imports
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function simpleAnnouncementCheck() {
    try {
        console.log('🔍 Simple announcement check...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Define schemas inline to avoid import issues
        const announcementSchema = new mongoose.Schema({
            title: String,
            content: String,
            type: String,
            priority: String,
            targetAudience: String,
            isActive: Boolean,
            startDate: Date,
            endDate: Date,
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: Date,
            updatedAt: Date
        });

        const Announcement = mongoose.model('Announcement', announcementSchema);

        // Get all announcements
        const announcements = await Announcement.find({});
        console.log(`📊 Total announcements: ${announcements.length}`);

        if (announcements.length > 0) {
            console.log('\n📋 Announcements:');
            announcements.forEach((ann, index) => {
                console.log(`${index + 1}. "${ann.title}"`);
                console.log(`   Type: ${ann.type}`);
                console.log(`   Target: ${ann.targetAudience}`);
                console.log(`   Active: ${ann.isActive}`);
                console.log(`   Created by: ${ann.createdBy}`);
                console.log(`   Created: ${ann.createdAt}`);
                console.log('');
            });

            // Check if any are active and target 'all'
            const activeForAll = announcements.filter(a => 
                a.isActive && (a.targetAudience === 'all' || !a.targetAudience)
            );
            console.log(`📊 Active announcements for 'all': ${activeForAll.length}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

simpleAnnouncementCheck().catch(console.error);