/**
 * Check Departments Script
 * 
 * Utility script to list all departments in the database
 * Useful for debugging and verification
 * 
 * Usage: node server/scripts/checkDepartments.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Department from '../modules/hr-core/users/models/department.model.js';

dotenv.config();

/**
 * Check and display all departments
 */
const checkDepartments = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        const departments = await Department.find().populate('manager', 'username email');
        console.log(`📊 Total departments: ${departments.length}\n`);

        if (departments.length > 0) {
            console.log('Departments:');
            console.log('─'.repeat(60));
            departments.forEach((dept, index) => {
                const manager = dept.manager ? `${dept.manager.username}` : 'No manager';
                console.log(`${index + 1}. ${dept.name} (${dept.code || 'N/A'}) - Manager: ${manager}`);
            });
            console.log('─'.repeat(60));
        } else {
            console.log('⚠️  No departments found in database!');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDepartments();
