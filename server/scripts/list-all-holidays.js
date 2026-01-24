/**
 * List all holidays in the database
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Holiday from '../modules/hr-core/holidays/models/holiday.model.js';

dotenv.config();

const listHolidays = async () => {
    try {
        console.log('🔧 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        const allHolidays = await Holiday.find({});
        
        if (allHolidays.length === 0) {
            console.log('❌ No holiday records found in the database');
            console.log('   The holidays collection is empty\n');
        } else {
            console.log(`✓ Found ${allHolidays.length} holiday record(s):\n`);
            
            allHolidays.forEach((record, index) => {
                console.log(`📋 Record ${index + 1}:`);
                console.log(`   Tenant ID: ${record.tenantId}`);
                console.log(`   Weekend Days: ${record.weekendDays.join(', ')}`);
                console.log(`   Official Holidays: ${record.officialHolidays.length}`);
                console.log(`   Weekend Work Days: ${record.weekendWorkDays.length}`);
                console.log(`   Early Leave Dates: ${record.earlyLeaveDates.length}`);
                
                if (record.officialHolidays.length > 0) {
                    console.log(`\n   📅 Official Holidays:`);
                    record.officialHolidays.forEach((holiday, idx) => {
                        const date = new Date(holiday.date);
                        console.log(`      ${idx + 1}. ${date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                        })} - ${holiday.name} ${holiday.isIslamic ? '🌙' : ''}`);
                    });
                }
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('✓ Database connection closed');
    }
};

listHolidays();
