import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Platform User Schema (matching current model)
const platformUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super-admin', 'support', 'operations'],
    default: 'super-admin'
  },
  permissions: [{ type: String }],
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'locked'],
    default: 'active'
  },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'platform_users'
});

const PlatformUser = mongoose.model('PlatformUser', platformUserSchema, 'platform_users');

async function recreatePlatformAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing admin
    await PlatformUser.deleteOne({ email: 'admin@platform.local' });
    console.log('🗑️ Deleted existing admin');

    // Create platform admin with all permissions
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    
    const platformAdmin = new PlatformUser({
      email: 'admin@platform.local',
      password: hashedPassword,
      firstName: 'Platform',
      lastName: 'Administrator',
      role: 'super-admin',
      permissions: [
        'manage_companies',
        'view_companies',
        'manage_modules',
        'view_modules',
        'manage_licenses',
        'view_licenses',
        'manage_platform_users',
        'view_platform_users',
        'view_analytics',
        'export_data',
        'manage_system',
        'view_logs',
        'manage_billing',
        'view_billing'
      ],
      status: 'active'
    });

    await platformAdmin.save();
    
    console.log('✅ Platform admin recreated successfully!');
    console.log('Email: admin@platform.local');
    console.log('Password: Admin@123456');
    console.log('Role: super-admin');
    console.log('Status: active');
    console.log('Permissions: All permissions granted');

  } catch (error) {
    console.error('❌ Error recreating platform admin:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

recreatePlatformAdmin();