#!/usr/bin/env node

/**
 * Create New Company Employees Script
 * Creates employees for the new Company model system
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import chalk from 'chalk';
import Company from '../platform/models/Company.js';
import User from '../modules/hr-core/models/User.js';

// Load environment variables
dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-platform');
    console.log(chalk.green('✅ Connected to MongoDB'));
  } catch (error) {
    console.error(chalk.red('❌ MongoDB connection failed:'), error.message);
    process.exit(1);
  }
}

async function createNewCompanyEmployees() {
  try {
    await connectDB();

    console.log(chalk.blue('\n🏢 Creating Employees for New Company Model\n'));

    // Find TechCorp Solutions in the new Company model
    const company = await Company.findOne({ slug: 'techcorp_solutions' });
    
    if (!company) {
      console.log(chalk.red('❌ TechCorp Solutions company not found in new Company model'));
      return;
    }

    console.log(chalk.green('✅ Found TechCorp Solutions:'));
    console.log(`  Name: ${company.name}`);
    console.log(`  Slug: ${company.slug}`);
    console.log(`  ID: ${company._id}`);

    // Define TechCorp Solutions employees
    const employees = [
      { email: 'admin@techcorp.com', firstName: 'Admin', lastName: 'TechCorp', role: 'admin', password: 'admin123', employeeId: 'TC001' },
      { email: 'hr@techcorp.com', firstName: 'Sarah', lastName: 'Johnson', role: 'hr', password: 'hr123', employeeId: 'TC002' },
      { email: 'manager@techcorp.com', firstName: 'Mike', lastName: 'Wilson', role: 'manager', password: 'manager123', employeeId: 'TC003' },
      { email: 'john.doe@techcorp.com', firstName: 'John', lastName: 'Doe', role: 'employee', password: 'employee123', employeeId: 'TC004' },
      { email: 'jane.smith@techcorp.com', firstName: 'Jane', lastName: 'Smith', role: 'employee', password: 'employee123', employeeId: 'TC005' },
      { email: 'ahmed.ali@techcorp.com', firstName: 'Ahmed', lastName: 'Ali', role: 'employee', password: 'employee123', employeeId: 'TC006' },
      { email: 'fatma.mohamed@techcorp.com', firstName: 'Fatma', lastName: 'Mohamed', role: 'employee', password: 'employee123', employeeId: 'TC007' },
      { email: 'omar.ibrahim@techcorp.com', firstName: 'Omar', lastName: 'Ibrahim', role: 'employee', password: 'employee123', employeeId: 'TC008' }
    ];

    console.log(chalk.yellow('\n📝 Creating employees...\n'));

    let created = 0;
    let skipped = 0;

    for (const employeeData of employees) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: employeeData.email });
        
        if (existingUser) {
          // Update existing user to use new company
          existingUser.tenantId = company._id;
          await existingUser.save();
          console.log(chalk.blue(`  ↻ Updated existing user: ${employeeData.firstName} ${employeeData.lastName} (${employeeData.email})`));
          skipped++;
        } else {
          // Create new user
          const user = new User({
            firstName: employeeData.firstName,
            lastName: employeeData.lastName,
            email: employeeData.email,
            password: employeeData.password, // Will be hashed by pre-save hook
            role: employeeData.role,
            employeeId: employeeData.employeeId,
            tenantId: company._id, // Use new company ID
            status: 'active',
            hireDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await user.save();
          console.log(chalk.green(`  ✓ Created: ${employeeData.firstName} ${employeeData.lastName} (${employeeData.email}) - ${employeeData.role}`));
          created++;
        }

      } catch (error) {
        console.log(chalk.red(`  ❌ Failed to create ${employeeData.email}:`), error.message);
      }
    }

    console.log(chalk.blue('\n📊 Summary:'));
    console.log(`  Created: ${created} employees`);
    console.log(`  Updated: ${skipped} employees`);
    console.log(`  Total: ${created + skipped} employees`);

    // Update company usage
    const totalEmployees = created + skipped;
    company.usage.employees = totalEmployees;
    await company.save();

    console.log(chalk.green(`\n✅ Updated company usage: ${totalEmployees} employees`));

    // Verify the employees
    console.log(chalk.yellow('\n🔍 Verification:'));
    const companyUsers = await User.find({ tenantId: company._id }).select('firstName lastName email role employeeId');
    
    console.log(`\n${company.name} (${companyUsers.length} employees):`);
    companyUsers.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - ID: ${user.employeeId}`);
    });

    console.log(chalk.green('\n🎉 TechCorp Solutions employees created successfully!'));
    console.log(chalk.blue('\n🔑 Login credentials:'));
    console.log('  Admin: admin@techcorp.com / admin123');
    console.log('  HR: hr@techcorp.com / hr123');
    console.log('  Manager: manager@techcorp.com / manager123');
    console.log('  Employee: john.doe@techcorp.com / employee123');

    console.log(chalk.green('\n✅ Users can now login and access the Advanced Reports module!'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to create employees:'), error.message);
  } finally {
    await mongoose.disconnect();
    console.log(chalk.blue('\n🔌 Disconnected from MongoDB'));
  }
}

createNewCompanyEmployees();