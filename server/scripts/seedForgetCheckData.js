/**
 * Seed Forget Check Data Script
 * 
 * Creates sample forget check-in and check-out records for testing
 * Run with: node scripts/seedForgetCheckData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ForgetCheck from '../modules/hr-core/attendance/models/forgetCheck.model.js';
import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';

// Load environment variables
dotenv.config();

// TechCorp Solutions tenant ID (from the main database)
const TENANT_ID = 'techcorp_solutions';

// Connect to TechCorp Solutions database
const connectToTechCorp = async () => {
    const dbName = 'hrsm_techcorp_solutions';
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const fullUri = `${mongoUri}/${dbName}`;
    
    await mongoose.connect(fullUri, {
        writeConcern: { w: 1 } // Use simple write concern instead of majority
    });
    console.log(`Connected to ${dbName} database`);
};

// Sample forget check data
const seedWithUsers = async (users, tenantId) => {
    try {
        // Clear existing forget check data
        await ForgetCheck.deleteMany({ tenantId: tenantId });
        console.log('🧹 Cleared existing forget check data');
        
        const forgetCheckData = [];
        const statuses = ['pending', 'approved', 'rejected'];
        const requestTypes = ['check-in', 'check-out'];
        
        // Reasons for forget check requests
        const checkInReasons = [
            'Forgot to check in due to urgent meeting with client',
            'System was down when I arrived at the office',
            'Had to rush to emergency meeting, forgot to check in',
            'Card reader was not working at main entrance',
            'Arrived early for project deadline, forgot to check in',
            'Had to attend to family emergency, forgot check-in procedure',
            'Network issues prevented mobile check-in',
            'Was helping colleague with urgent task, missed check-in',
            'Attended early morning training session, forgot to check in',
            'Had to take important client call immediately upon arrival'
        ];
        
        const checkOutReasons = [
            'Left for urgent doctor appointment, forgot to check out',
            'System maintenance was ongoing during my departure time',
            'Had to leave immediately for family emergency',
            'Forgot to check out after working late on project',
            'Card reader malfunction at exit gate',
            'Left with manager for client meeting, forgot check-out',
            'Power outage affected check-out system',
            'Had to rush to catch last bus, forgot to check out',
            'Attended off-site meeting, forgot to check out first',
            'Left early due to illness, forgot check-out procedure'
        ];
        
        // Create forget check records for the last 30 days
        const today = new Date();
        
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            // Skip weekends (Friday = 5, Saturday = 6 in UAE)
            if (date.getDay() === 5 || date.getDay() === 6) {
                continue;
            }
            
            // Create 1-3 forget check requests per day
            const requestsPerDay = Math.floor(Math.random() * 3) + 1;
            
            for (let j = 0; j < requestsPerDay; j++) {
                const user = users[Math.floor(Math.random() * users.length)];
                const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                
                // Generate realistic times
                let requestedTime;
                if (requestType === 'check-in') {
                    // Check-in times between 7:00 AM and 10:00 AM
                    const hour = Math.floor(Math.random() * 3) + 7; // 7-9
                    const minute = Math.floor(Math.random() * 60);
                    requestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                } else {
                    // Check-out times between 4:00 PM and 8:00 PM
                    const hour = Math.floor(Math.random() * 4) + 16; // 16-19
                    const minute = Math.floor(Math.random() * 60);
                    requestedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                }
                
                // Select appropriate reason
                const reasons = requestType === 'check-in' ? checkInReasons : checkOutReasons;
                const reason = reasons[Math.floor(Math.random() * reasons.length)];
                
                const forgetCheckRecord = {
                    tenantId: tenantId,
                    employee: user._id,
                    date: date,
                    requestType: requestType,
                    requestedTime: requestedTime,
                    reason: reason,
                    status: status,
                    department: user.department?._id,
                    position: user.position?._id
                };
                
                // Add approval/rejection details based on status
                if (status === 'approved') {
                    // Find an HR or Admin user to be the approver
                    const approver = users.find(u => u.role === 'hr' || u.role === 'admin');
                    if (approver) {
                        forgetCheckRecord.approvedBy = approver._id;
                        forgetCheckRecord.approvedAt = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
                    }
                } else if (status === 'rejected') {
                    // Find an HR or Admin user to be the rejector
                    const rejector = users.find(u => u.role === 'hr' || u.role === 'admin');
                    if (rejector) {
                        forgetCheckRecord.rejectedBy = rejector._id;
                        forgetCheckRecord.rejectedAt = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
                        forgetCheckRecord.rejectionReason = [
                            'Insufficient documentation provided',
                            'Request submitted too late (beyond 7-day limit)',
                            'Conflicting attendance record already exists',
                            'Reason not acceptable for forget check request',
                            'Multiple similar requests in short period',
                            'Unable to verify the circumstances mentioned'
                        ][Math.floor(Math.random() * 6)];
                    }
                }
                
                forgetCheckData.push(forgetCheckRecord);
            }
        }
        
        // Insert all forget check records
        const insertedRecords = await ForgetCheck.insertMany(forgetCheckData);
        console.log(`✅ Created ${insertedRecords.length} forget check records`);
        
        // Display summary statistics
        const summary = {
            total: insertedRecords.length,
            checkIn: insertedRecords.filter(r => r.requestType === 'check-in').length,
            checkOut: insertedRecords.filter(r => r.requestType === 'check-out').length,
            pending: insertedRecords.filter(r => r.status === 'pending').length,
            approved: insertedRecords.filter(r => r.status === 'approved').length,
            rejected: insertedRecords.filter(r => r.status === 'rejected').length
        };
        
        console.log('\n📊 Summary:');
        console.log(`Total Records: ${summary.total}`);
        console.log(`Check-in Requests: ${summary.checkIn}`);
        console.log(`Check-out Requests: ${summary.checkOut}`);
        console.log(`Pending: ${summary.pending}`);
        console.log(`Approved: ${summary.approved}`);
        console.log(`Rejected: ${summary.rejected}`);
        
        // Display sample records
        console.log('\n📋 Sample Records:');
        const sampleRecords = await ForgetCheck.find({ tenantId: tenantId })
            .populate('employee', 'personalInfo.fullName email')
            .populate('department', 'name')
            .populate('position', 'title')
            .limit(5)
            .sort({ createdAt: -1 });
            
        sampleRecords.forEach((record, index) => {
            const employeeName = record.employee?.personalInfo?.fullName || record.employee?.email || 'Unknown';
            console.log(`${index + 1}. ${employeeName} - ${record.requestType} at ${record.requestedTime} on ${record.date.toDateString()} - Status: ${record.status}`);
        });
        
    } catch (error) {
        console.error('❌ Error creating forget check data:', error);
        throw error;
    }
};

const createForgetCheckData = async () => {
    try {
        console.log('🚀 Starting forget check data seeding...');
        
        // Get users from the database
        const users = await User.find({ tenantId: TENANT_ID }).populate('department position');
        console.log(`Found ${users.length} users`);
        
        // If no users found with the expected tenant ID, try to find users with any tenant ID
        if (users.length === 0) {
            const allUsers = await User.find({});
            console.log(`Total users in database: ${allUsers.length}`);
            
            if (allUsers.length > 0) {
                const actualTenantId = allUsers[0].tenantId;
                console.log(`Using actual tenant ID from database: ${actualTenantId}`);
                
                const usersWithActualId = await User.find({ tenantId: actualTenantId }).populate('department position');
                console.log(`Found ${usersWithActualId.length} users with actual tenant ID`);
                
                if (usersWithActualId.length > 0) {
                    await seedWithUsers(usersWithActualId, actualTenantId);
                    return;
                }
            }
            
            console.log('❌ No users found. Please run user seeding first.');
            return;
        }
        
        await seedWithUsers(users, TENANT_ID);
        
    } catch (error) {
        console.error('❌ Error creating forget check data:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    try {
        await connectToTechCorp();
        await createForgetCheckData();
        console.log('\n🎉 Forget check data seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Database connection closed');
        process.exit(0);
    }
};

// Run the script
main();