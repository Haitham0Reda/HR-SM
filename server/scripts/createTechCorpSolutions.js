#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../platform/models/Company.js';

dotenv.config();

async function createTechCorpSolutions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if company already exists
    const existing = await Company.findOne({ slug: 'techcorp_solutions' });
    if (existing) {
      console.log('⚠️ TechCorp Solutions already exists, updating...');
      
      // Update the existing company with proper module configuration
      const moduleConfig = {
        enabled: true,
        tier: 'business',
        limits: {
          employees: 200,
          devices: null,
          storage: 10737418240, // 10GB
          apiCalls: 50000
        },
        enabledAt: new Date(),
        disabledAt: null
      };

      // Enable all available modules
      const moduleKeys = [
        'hr-core',      // Required core module
        'attendance',   // Time tracking
        'leave',        // Leave management
        'payroll',      // Payroll (business tier)
        'documents',    // Document management
        'reports',      // Advanced reports (business tier)
        'tasks',        // Task management
        'surveys',      // Employee surveys (business tier)
        'announcements', // Company announcements
        'events'        // Event management
      ];

      // Clear existing modules and set new ones
      existing.modules = new Map();
      
      moduleKeys.forEach(moduleKey => {
        existing.modules.set(moduleKey, { ...moduleConfig });
      });

      // Update company status and subscription
      existing.status = 'active';
      existing.subscription = {
        plan: 'business',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        autoRenew: true
      };

      existing.markModified('modules');
      await existing.save();
      
      console.log('✅ TechCorp Solutions updated successfully');
      console.log('📋 Enabled modules:', Array.from(existing.modules.keys()));
      
    } else {
      console.log('🏢 Creating TechCorp Solutions...');
      
      // Create subscription end date (1 year from now)
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      // Create new company
      const techcorp = new Company({
        name: 'TechCorp Solutions',
        slug: 'techcorp_solutions',
        databaseName: 'techcorp_solutions_db',
        adminEmail: 'admin@techcorp.com',
        phone: '+1-555-0123',
        address: '123 Tech Street, Silicon Valley, CA 94000',
        status: 'active',
        subscription: {
          plan: 'business',
          startDate: new Date(),
          endDate: endDate,
          autoRenew: true
        },
        settings: {
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD',
          language: 'en'
        },
        usage: {
          employees: 45,
          storage: 2147483648, // 2GB used
          apiCalls: 15000,
          lastUpdated: new Date()
        }
      });

      // Enable all available modules for business tier
      const moduleConfig = {
        enabled: true,
        tier: 'business',
        limits: {
          employees: 200,
          devices: null,
          storage: 10737418240, // 10GB
          apiCalls: 50000
        },
        enabledAt: new Date(),
        disabledAt: null
      };

      const moduleKeys = [
        'hr-core',      // Required core module
        'attendance',   // Time tracking
        'leave',        // Leave management
        'payroll',      // Payroll (business tier)
        'documents',    // Document management
        'reports',      // Advanced reports (business tier)
        'tasks',        // Task management
        'surveys',      // Employee surveys (business tier)
        'announcements', // Company announcements
        'events'        // Event management
      ];

      moduleKeys.forEach(moduleKey => {
        techcorp.modules.set(moduleKey, { ...moduleConfig });
      });

      await techcorp.save();
      
      console.log('✅ TechCorp Solutions created successfully');
      console.log('🆔 Company ID:', techcorp._id);
      console.log('📋 Enabled modules:', Array.from(techcorp.modules.keys()));
    }

    // Verify the configuration
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    if (company) {
      console.log('\n🔍 Verification:');
      console.log('Name:', company.name);
      console.log('Status:', company.status);
      console.log('Subscription Plan:', company.subscription.plan);
      console.log('Subscription Active:', company.isSubscriptionActive());
      
      const enabledModules = company.getEnabledModules();
      console.log('Enabled Modules Count:', enabledModules.length);
      console.log('Enabled Modules:', enabledModules);
      
      if (enabledModules.length > 0) {
        console.log('\n🎉 SUCCESS: TechCorp Solutions dashboard is now compatible with enabled modules!');
      } else {
        console.log('\n❌ ERROR: No modules are enabled - dashboard compatibility issue persists');
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
createTechCorpSolutions();