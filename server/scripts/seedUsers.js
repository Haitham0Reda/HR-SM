/**
 * Seed Users Script
 * 
 * Creates users for all departments and sub-departments:
 * - One manager for each main department
 * - One employee for each sub-department
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Department from '../models/department.model.js';
import Position from '../models/position.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const seedUsers = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Fetch all departments
        const departments = await Department.find().lean();
        if (!departments.length) {
            console.log('❌ No departments found. Run setupDepartmentsAndPositions.js first.');
            process.exit(1);
        }

        console.log(`📊 Found ${departments.length} departments\n`);

        // Fetch all positions
        const positions = await Position.find().lean();
        console.log(`📊 Found ${positions.length} positions\n`);

        // Separate main and sub-departments
        const mainDepartments = departments.filter(d => !d.parentDepartment);
        const subDepartments = departments.filter(d => d.parentDepartment);

        console.log(`Main Departments: ${mainDepartments.length}`);
        console.log(`Sub-Departments: ${subDepartments.length}\n`);

        const users = [];
        const defaultPassword = await bcrypt.hash('Password123!', 10);

        // -----------------------------------------
        // Create a Manager for each Main Department
        // -----------------------------------------
        console.log('👔 Creating managers for main departments...');
        for (const dept of mainDepartments) {
            const username = `${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.manager`;
            const email = `${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.manager@company.com`;
            
            // Find a manager position for this department
            const managerPosition = positions.find(p => 
                p.department.toString() === dept._id.toString() && 
                (p.level === 'Manager' || p.title.toLowerCase().includes('manager'))
            );

            users.push({
                username,
                email,
                password: defaultPassword,
                role: 'manager',
                employeeId: `EMP-${dept.code}-MGR`,
                personalInfo: {
                    fullName: `${dept.name} Manager`,
                    firstName: dept.name,
                    lastName: 'Manager',
                    arabicName: `مدير ${dept.arabicName || dept.name}`,
                    gender: 'male',
                    nationality: 'Egyptian',
                    phone: `+20100000${String(users.length).padStart(4, '0')}`
                },
                department: dept._id,
                position: managerPosition?._id,
                employment: {
                    hireDate: new Date(2024, 0, 1), // January 1, 2024
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            });

            console.log(`  ✓ ${username} - ${dept.name} (${dept.code})`);
        }

        // -----------------------------------------
        // Create Employees for Sub-Departments
        // -----------------------------------------
        console.log('\n👥 Creating employees for sub-departments...');
        for (const subDept of subDepartments) {
            const parent = departments.find(d => d._id.toString() === subDept.parentDepartment.toString());
            const username = `${subDept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.employee`;
            const email = `${subDept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.employee@company.com`;
            
            // Find a position for this sub-department
            const employeePosition = positions.find(p => 
                p.department.toString() === parent._id.toString() &&
                (p.level === 'Mid' || p.level === 'Entry' || p.level === 'Junior')
            );

            users.push({
                username,
                email,
                password: defaultPassword,
                role: 'employee',
                employeeId: `EMP-${subDept.code}`,
                personalInfo: {
                    fullName: `${subDept.name} Employee`,
                    firstName: subDept.name,
                    lastName: 'Employee',
                    arabicName: `موظف ${subDept.arabicName || subDept.name}`,
                    gender: users.length % 2 === 0 ? 'male' : 'female',
                    nationality: 'Egyptian',
                    phone: `+20100000${String(users.length).padStart(4, '0')}`
                },
                department: subDept._id,
                position: employeePosition?._id,
                employment: {
                    hireDate: new Date(2024, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1),
                    contractType: 'full-time',
                    employmentStatus: 'active'
                }
            });

            console.log(`  ✓ ${username} - ${parent.name} > ${subDept.name} (${subDept.code})`);
        }

        // -----------------------------------------
        // Create Additional Employees for Main Departments (without sub-departments)
        // -----------------------------------------
        console.log('\n👥 Creating employees for main departments without sub-departments...');
        for (const dept of mainDepartments) {
            // Check if this department has sub-departments
            const hasSubDepts = subDepartments.some(sub => 
                sub.parentDepartment.toString() === dept._id.toString()
            );

            // If no sub-departments, create 2-3 employees directly in the main department
            if (!hasSubDepts) {
                const employeeCount = Math.floor(Math.random() * 2) + 2; // 2-3 employees
                
                for (let i = 1; i <= employeeCount; i++) {
                    const username = `${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.emp${i}`;
                    const email = `${dept.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.emp${i}@company.com`;
                    
                    // Find a position for this department
                    const employeePosition = positions.find(p => 
                        p.department.toString() === dept._id.toString() &&
                        (p.level === 'Mid' || p.level === 'Entry' || p.level === 'Junior' || p.level === 'Senior')
                    );

                    users.push({
                        username,
                        email,
                        password: defaultPassword,
                        role: 'employee',
                        employeeId: `EMP-${dept.code}-${String(i).padStart(2, '0')}`,
                        personalInfo: {
                            fullName: `${dept.name} Employee ${i}`,
                            firstName: dept.name,
                            lastName: `Employee ${i}`,
                            arabicName: `موظف ${dept.arabicName || dept.name} ${i}`,
                            gender: users.length % 2 === 0 ? 'male' : 'female',
                            nationality: 'Egyptian',
                            phone: `+20100000${String(users.length).padStart(4, '0')}`
                        },
                        department: dept._id,
                        position: employeePosition?._id,
                        employment: {
                            hireDate: new Date(2024, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1),
                            contractType: 'full-time',
                            employmentStatus: 'active'
                        }
                    });

                    console.log(`  ✓ ${username} - ${dept.name} (${dept.code})`);
                }
            }
        }

        // -----------------------------------------
        // Insert Users
        // -----------------------------------------
        console.log('\n💾 Inserting users into database...');
        
        // Check for existing users and skip them
        const existingUsernames = await User.find({
            username: { $in: users.map(u => u.username) }
        }).select('username').lean();
        
        const existingUsernameSet = new Set(existingUsernames.map(u => u.username));
        const newUsers = users.filter(u => !existingUsernameSet.has(u.username));

        if (newUsers.length === 0) {
            console.log('⚠️  All users already exist. No new users to create.');
        } else {
            const created = await User.insertMany(newUsers);
            console.log(`✅ Created ${created.length} new users.`);
        }

        if (existingUsernameSet.size > 0) {
            console.log(`ℹ️  Skipped ${existingUsernameSet.size} existing users.`);
        }

        // -----------------------------------------
        // Summary
        // -----------------------------------------
        console.log('\n' + '='.repeat(60));
        console.log('✅ User Seeding Complete!');
        console.log('='.repeat(60));

        const totalUsers = await User.countDocuments();
        const managerCount = await User.countDocuments({ role: 'manager' });
        const employeeCount = await User.countDocuments({ role: 'employee' });

        console.log(`\n📊 Summary:`);
        console.log(`   Total Users: ${totalUsers}`);
        console.log(`   - Managers: ${managerCount}`);
        console.log(`   - Employees: ${employeeCount}`);
        console.log(`\n🔑 Default Password: Password123!`);
        console.log('\n' + '='.repeat(60));

        // Show sample login credentials
        console.log('\n📝 Sample Login Credentials:');
        const sampleUsers = await User.find().limit(5).select('username email role department').populate('department', 'name');
        sampleUsers.forEach(user => {
            console.log(`   ${user.username}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Department: ${user.department?.name || 'N/A'}`);
            console.log(`   Password: Password123!`);
            console.log('');
        });

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
};

// Run the seed
seedUsers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
