import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function fixAnnouncementAuth() {
    try {
        console.log('🔧 Fixing Announcement Authentication Issue...\n');

        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database');

        // Import models
        const { default: User } = await import('../modules/hr-core/users/models/user.model.js');
        const { default: Announcement } = await import('../modules/announcements/models/announcement.model.js');

        // Find the techcorp admin user
        const user = await User.findOne({ email: 'admin@techcorp.com' });
        if (!user) {
            console.log('❌ User admin@techcorp.com not found');
            
            // Let's see what users exist
            const allUsers = await User.find({}).select('email tenantId role');
            console.log('\n📋 Available users:');
            allUsers.forEach(u => {
                console.log(`   - ${u.email} (${u.role}) - Tenant: ${u.tenantId}`);
            });
            return;
        }

        console.log('👤 Found User:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Tenant ID: ${user.tenantId}`);
        console.log(`   User ID: ${user._id}\n`);

        // Check announcements for this tenant
        const tenantUsers = await User.find({ tenantId: user.tenantId }).select('_id email');
        const tenantUserIds = tenantUsers.map(u => u._id);
        
        console.log(`🏢 Users in tenant ${user.tenantId}:`);
        tenantUsers.forEach(u => console.log(`   - ${u.email} (${u._id})`));
        
        const announcements = await Announcement.find({ createdBy: { $in: tenantUserIds } });
        console.log(`\n📢 Announcements for this tenant: ${announcements.length}`);
        announcements.forEach((ann, i) => {
            console.log(`   ${i + 1}. "${ann.title}"`);
        });

        if (announcements.length === 0) {
            console.log('\n⚠️  No announcements found for this tenant!');
            console.log('Creating sample announcements...');
            
            // Create sample announcements
            const sampleAnnouncements = [
                {
                    title: 'Welcome to TechCorp HR System',
                    content: 'Welcome to our new HR management system. Please explore the features and let us know if you have any questions.',
                    priority: 'high',
                    targetAudience: 'all',
                    isActive: true,
                    createdBy: user._id
                },
                {
                    title: 'Q1 2026 Holiday Schedule',
                    content: 'Please find attached the holiday schedule for Q1 2026. Plan your time off accordingly.',
                    priority: 'medium',
                    targetAudience: 'all',
                    isActive: true,
                    createdBy: user._id
                }
            ];

            for (const annData of sampleAnnouncements) {
                const announcement = new Announcement(annData);
                await announcement.save();
                console.log(`   ✅ Created: "${annData.title}"`);
            }
        }

        // Generate correct token
        const token = jwt.sign(
            { 
                userId: user._id, 
                email: user.email, 
                role: user.role,
                tenantId: user.tenantId 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('\n🔑 Correct Token Generated:');
        console.log(token);
        
        console.log('\n📋 To fix the frontend:');
        console.log('1. Open browser console (F12)');
        console.log('2. Run this command:');
        console.log(`localStorage.setItem('token', '${token}');`);
        console.log('localStorage.removeItem("tenant_token");');
        console.log('window.location.reload();');
        
        console.log('\n✅ This should fix the announcements display issue.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from database');
    }
}

fixAnnouncementAuth();