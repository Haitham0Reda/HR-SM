/**
 * Create Sample Payroll Data for TechCorp Solutions
 * Generates realistic payroll records for existing employees
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

// Payroll schema
const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    period: {
        type: String, // e.g., '2025-01' for January 2025
        required: true
    },
    deductions: [{
        type: {
            type: String,
            enum: ['tax', 'insurance', 'loan', 'absence', 'medical', 'transportation', 'mobile-bill', 'disciplinary-sanctions', 'other'],
            required: true
        },
        arabicName: String,
        description: String,
        amount: { type: Number, required: true }
    }],
    totalDeductions: {
        type: Number,
        required: true,
        default: 0
    },
    tenantId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// User schema (simplified)
const userSchema = new mongoose.Schema({
    email: String,
    name: String,
    role: String,
    tenantId: String,
    salary: Number // Base salary
}, { collection: 'users' });

const Payroll = mongoose.model('Payroll', payrollSchema);
const User = mongoose.model('User', userSchema);

// Sample payroll data generator
const generatePayrollData = (employee, period) => {
    const baseSalary = getBaseSalary(employee.role);
    const deductions = generateDeductions(employee, baseSalary);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
        employee: employee._id,
        period,
        deductions,
        totalDeductions,
        tenantId: employee.tenantId
    };
};

// Get base salary based on role
const getBaseSalary = (role) => {
    const salaries = {
        'admin': 8000,
        'hr': 6000,
        'manager': 7000,
        'employee': 4500
    };
    return salaries[role] || 4000;
};

// Generate realistic deductions
const generateDeductions = (employee, baseSalary) => {
    const deductions = [];

    // Tax deduction (15% of salary)
    deductions.push({
        type: 'tax',
        arabicName: 'ضريبة الدخل',
        description: 'Income tax deduction',
        amount: Math.round(baseSalary * 0.15)
    });

    // Insurance deduction (5% of salary)
    deductions.push({
        type: 'insurance',
        arabicName: 'التأمين الصحي',
        description: 'Health insurance premium',
        amount: Math.round(baseSalary * 0.05)
    });

    // Transportation allowance deduction (for some employees)
    if (Math.random() > 0.3) {
        deductions.push({
            type: 'transportation',
            arabicName: 'بدل المواصلات',
            description: 'Transportation allowance deduction',
            amount: Math.round(200 + Math.random() * 300)
        });
    }

    // Mobile bill deduction (for some employees)
    if (Math.random() > 0.5) {
        deductions.push({
            type: 'mobile-bill',
            arabicName: 'فاتورة الهاتف',
            description: 'Mobile phone bill',
            amount: Math.round(50 + Math.random() * 100)
        });
    }

    // Medical deduction (occasional)
    if (Math.random() > 0.7) {
        deductions.push({
            type: 'medical',
            arabicName: 'مصاريف طبية',
            description: 'Medical expenses deduction',
            amount: Math.round(100 + Math.random() * 500)
        });
    }

    // Loan deduction (for some employees)
    if (Math.random() > 0.6) {
        deductions.push({
            type: 'loan',
            arabicName: 'قرض شخصي',
            description: 'Personal loan installment',
            amount: Math.round(300 + Math.random() * 700)
        });
    }

    return deductions;
};

async function createPayrollData() {
    console.log('💰 Creating Sample Payroll Data for TechCorp Solutions...\n');

    try {
        await connectDB();

        const tenantId = '693db0e2ccc5ea08aeee120c';
        
        // Find all TechCorp employees
        console.log('1. Finding TechCorp employees...');
        const employees = await User.find({ tenantId }).select('_id email name role tenantId');
        
        console.log(`   Found ${employees.length} employees:`);
        employees.forEach((emp, index) => {
            console.log(`   ${index + 1}. ${emp.email} (${emp.role})`);
        });

        if (employees.length === 0) {
            console.log('❌ No employees found for TechCorp');
            return;
        }

        // Generate payroll data for the last 3 months
        const periods = ['2024-11', '2024-12', '2025-01'];
        
        console.log('\n2. Generating payroll data...');
        
        // Clear existing payroll data for this tenant
        await Payroll.deleteMany({ tenantId });
        console.log('   Cleared existing payroll data');

        const payrollRecords = [];

        for (const period of periods) {
            console.log(`   Generating data for ${period}...`);
            
            for (const employee of employees) {
                const payrollData = generatePayrollData(employee, period);
                payrollRecords.push(payrollData);
            }
        }

        // Insert all payroll records
        console.log('\n3. Inserting payroll records...');
        const insertedRecords = await Payroll.insertMany(payrollRecords);
        
        console.log(`✅ Created ${insertedRecords.length} payroll records`);

        // Display summary
        console.log('\n4. Payroll Summary:');
        console.log('='.repeat(80));
        
        for (const period of periods) {
            console.log(`\n📅 ${period}:`);
            const periodRecords = insertedRecords.filter(r => r.period === period);
            
            for (const record of periodRecords) {
                const employee = employees.find(e => e._id.toString() === record.employee.toString());
                const baseSalary = getBaseSalary(employee.role);
                const netSalary = baseSalary - record.totalDeductions;
                
                console.log(`   ${employee.email.padEnd(25)} | Base: $${baseSalary.toString().padStart(5)} | Deductions: $${record.totalDeductions.toString().padStart(5)} | Net: $${netSalary.toString().padStart(5)}`);
            }
        }

        // Test API access
        console.log('\n5. Testing API access...');
        console.log('   You can now access payroll data via:');
        console.log('   GET /api/v1/payroll');
        console.log('   Authentication: admin@techcorp.com with tenantId: 693db0e2ccc5ea08aeee120c');

    } catch (error) {
        console.error('❌ Error creating payroll data:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
}

createPayrollData().catch(console.error);