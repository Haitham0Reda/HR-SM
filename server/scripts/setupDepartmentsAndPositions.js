/**
 * Setup Departments and Positions
 * 
 * Creates a comprehensive organizational structure
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from '../models/department.model.js';
import Position from '../models/position.model.js';

dotenv.config();

// Helper to create position one at a time (for auto-code generation)
const createPosition = async (data) => {
    const position = new Position(data);
    await position.save();
    return position;
};

const setupOrganization = async () => {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to database\n');

        // Clear existing data
        console.log('🗑️  Clearing existing departments and positions...');
        await Department.deleteMany({});
        await Position.deleteMany({});
        console.log('✅ Cleared\n');

        // Define all departments and positions
        const orgStructure = [
            {
                emoji: '🟦',
                name: 'Executive & Management',
                departments: [
                    {
                        name: 'Executive',
                        arabicName: 'الإدارة العليا',
                        description: 'Executive leadership and strategic management',
                        subDepartments: ['Executive Office', 'Corporate Management', 'Operations Leadership'],
                        positions: [
                            { title: 'CEO', arabicTitle: 'الرئيس التنفيذي', level: 'Executive', description: 'Highest authority responsible for overall company strategy and performance.' },
                            { title: 'Managing Director', arabicTitle: 'المدير العام', level: 'Executive', description: 'Oversees operations and ensures company goals are met.' },
                            { title: 'General Manager', arabicTitle: 'المدير العام', level: 'Executive', description: 'Manages daily operations and department performance.' }
                        ]
                    },
                    {
                        name: 'Operations',
                        arabicName: 'العمليات',
                        description: 'Operational management',
                        subDepartments: ['Operations Management', 'Operations Control'],
                        positions: [
                            { title: 'Operations Manager', arabicTitle: 'مدير العمليات', level: 'Manager', description: 'Oversees workflows, productivity, and operational performance.' },
                            { title: 'Operations Supervisor', arabicTitle: 'مشرف عمليات', level: 'Senior', description: 'Supervises daily operational tasks and staff.' }
                        ]
                    },
                    {
                        name: 'Projects',
                        arabicName: 'المشروعات',
                        description: 'Project planning and delivery',
                        subDepartments: ['Project Delivery'],
                        positions: [
                            { title: 'Project Manager', arabicTitle: 'مدير المشروع', level: 'Manager', description: 'Plans and manages project execution, deadlines, and budgets.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟩',
                name: 'Human Resources',
                departments: [
                    {
                        name: 'HR',
                        arabicName: 'الموارد البشرية',
                        description: 'Human resources management',
                        subDepartments: ['HR Management', 'HR Operations', 'Talent Acquisition', 'Payroll'],
                        positions: [
                            { title: 'HR Manager', arabicTitle: 'مدير الموارد البشرية', level: 'Manager', description: 'Oversees hiring, policies, employee relations, and HR planning.' },
                            { title: 'HR Officer', arabicTitle: 'مسؤول موارد بشرية', level: 'Mid', description: 'Handles employee records, attendance, and HR procedures.' },
                            { title: 'Recruiter', arabicTitle: 'مسؤول التوظيف', level: 'Mid', description: 'Manages job postings, interviews, and candidate selection.' },
                            { title: 'Payroll Specialist', arabicTitle: 'أخصائي كشوف المرتبات', level: 'Mid', description: 'Prepares payroll, deductions, and employee compensation.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟧',
                name: 'Finance & Accounting',
                departments: [
                    {
                        name: 'Finance',
                        arabicName: 'المالية',
                        description: 'Financial management',
                        subDepartments: ['Financial Management', 'Accounting', 'Audit'],
                        positions: [
                            { title: 'Finance Manager', arabicTitle: 'مدير المالية', level: 'Manager', description: 'Manages budgets, financial planning, and reporting.' },
                            { title: 'Senior Accountant', arabicTitle: 'محاسب أول', level: 'Senior', description: 'Oversees accounting tasks and supervises junior accountants.' },
                            { title: 'Accountant', arabicTitle: 'محاسب', level: 'Mid', description: 'Handles daily accounting transactions and reports.' },
                            { title: 'Internal Auditor', arabicTitle: 'مدقق داخلي', level: 'Senior', description: 'Ensures compliance and accuracy of internal financial processes.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟥',
                name: 'Administration',
                departments: [
                    {
                        name: 'Administration',
                        arabicName: 'الإدارة',
                        description: 'Administrative support',
                        subDepartments: ['Office Administration', 'Office Support', 'Documentation'],
                        positions: [
                            { title: 'Administrative Assistant', arabicTitle: 'مساعد إداري', level: 'Entry', description: 'Provides administrative support and organizes office tasks.' },
                            { title: 'Secretary', arabicTitle: 'سكرتير', level: 'Junior', description: 'Handles scheduling, communication, and document support.' },
                            { title: 'Document Controller', arabicTitle: 'مراقب مستندات', level: 'Mid', description: 'Manages document flow, archiving, and version control.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟪',
                name: 'Sales & Marketing',
                departments: [
                    {
                        name: 'Sales',
                        arabicName: 'المبيعات',
                        description: 'Sales operations',
                        subDepartments: ['Sales Management', 'Field Sales'],
                        positions: [
                            { title: 'Sales Manager', arabicTitle: 'مدير المبيعات', level: 'Manager', description: 'Leads sales teams and handles revenue strategy.' },
                            { title: 'Sales Executive', arabicTitle: 'تنفيذي مبيعات', level: 'Mid', description: 'Builds customer relationships and closes deals.' }
                        ]
                    },
                    {
                        name: 'Marketing',
                        arabicName: 'التسويق',
                        description: 'Marketing and brand management',
                        subDepartments: ['Marketing Management', 'Digital Marketing', 'Content'],
                        positions: [
                            { title: 'Marketing Manager', arabicTitle: 'مدير التسويق', level: 'Manager', description: 'Leads marketing strategies and brand development.' },
                            { title: 'Social Media Specialist', arabicTitle: 'أخصائي وسائل التواصل', level: 'Mid', description: 'Manages social media content, planning, and analytics.' },
                            { title: 'Content Creator', arabicTitle: 'منشئ محتوى', level: 'Junior', description: 'Produces written and visual content.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟨',
                name: 'IT & Technical',
                departments: [
                    {
                        name: 'IT',
                        arabicName: 'تكنولوجيا المعلومات',
                        description: 'Information technology',
                        subDepartments: ['IT Management', 'Infrastructure', 'Development', 'Technical Support'],
                        positions: [
                            { title: 'IT Manager', arabicTitle: 'مدير تكنولوجيا المعلومات', level: 'Manager', description: 'Oversees IT infrastructure and system operations.' },
                            { title: 'System Administrator', arabicTitle: 'مسؤول النظام', level: 'Mid', description: 'Maintains servers, networks, and system security.' },
                            { title: 'Software Engineer', arabicTitle: 'مهندس برمجيات', level: 'Mid', description: 'Designs and builds software applications.' },
                            { title: 'IT Support', arabicTitle: 'دعم فني', level: 'Entry', description: 'Provides technical help and solves user issues.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟫',
                name: 'Logistics',
                departments: [
                    {
                        name: 'Logistics',
                        arabicName: 'اللوجستيات',
                        description: 'Supply chain management',
                        subDepartments: ['Supply Chain'],
                        positions: [
                            { title: 'Logistics Coordinator', arabicTitle: 'منسق لوجستيات', level: 'Mid', description: 'Coordinates shipments, inventory, and logistics.' }
                        ]
                    },
                    {
                        name: 'Warehouse',
                        arabicName: 'المخازن',
                        description: 'Warehouse management',
                        subDepartments: ['Inventory Control'],
                        positions: [
                            { title: 'Storekeeper', arabicTitle: 'أمين مخزن', level: 'Entry', description: 'Manages stock, storage, and material handling.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟦',
                name: 'Engineering',
                departments: [
                    {
                        name: 'Engineering',
                        arabicName: 'الهندسة',
                        description: 'Engineering services',
                        subDepartments: ['Engineering Management', 'Mechanical', 'Electrical', 'Safety'],
                        positions: [
                            { title: 'Engineering Manager', arabicTitle: 'مدير الهندسة', level: 'Manager', description: 'Supervises engineering teams and technical planning.' },
                            { title: 'Mechanical Engineer', arabicTitle: 'مهندس ميكانيكا', level: 'Mid', description: 'Designs and maintains mechanical systems.' },
                            { title: 'Electrical Engineer', arabicTitle: 'مهندس كهرباء', level: 'Mid', description: 'Designs and maintains electrical systems.' },
                            { title: 'Safety Officer', arabicTitle: 'مسؤول السلامة', level: 'Junior', description: 'Implements safety standards and compliance.' }
                        ]
                    }
                ]
            },
            {
                emoji: '🟩',
                name: 'Other',
                departments: [
                    {
                        name: 'Creative',
                        arabicName: 'الإبداع',
                        description: 'Creative services',
                        subDepartments: ['Design'],
                        positions: [
                            { title: 'Graphic Designer', arabicTitle: 'مصمم جرافيك', level: 'Mid', description: 'Creates visual designs for branding and marketing.' }
                        ]
                    },
                    {
                        name: 'Security',
                        arabicName: 'الأمن',
                        description: 'Security services',
                        subDepartments: ['Site Security'],
                        positions: [
                            { title: 'Security Guard', arabicTitle: 'رجل أمن', level: 'Entry', description: 'Protects premises and monitors access.' }
                        ]
                    }
                ]
            }
        ];

        // Create departments and positions
        for (const category of orgStructure) {
            console.log(`${category.emoji} Creating ${category.name}...`);
            
            for (const deptData of category.departments) {
                // Create main department
                const dept = await Department.create({
                    name: deptData.name,
                    arabicName: deptData.arabicName,
                    description: deptData.description,
                    isActive: true
                });

                // Create sub-departments
                if (deptData.subDepartments) {
                    for (const subName of deptData.subDepartments) {
                        await Department.create({
                            name: subName,
                            arabicName: subName, // You can add Arabic names if needed
                            parentDepartment: dept._id,
                            isActive: true
                        });
                    }
                }

                // Create positions
                if (deptData.positions) {
                    for (const posData of deptData.positions) {
                        await createPosition({
                            title: posData.title,
                            arabicTitle: posData.arabicTitle,
                            department: dept._id,
                            level: posData.level,
                            description: posData.description,
                            isActive: true
                        });
                    }
                }
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ Organization Setup Complete!');
        console.log('='.repeat(60));

        const totalDepartments = await Department.countDocuments();
        const mainDepartments = await Department.countDocuments({ parentDepartment: null });
        const subDepartments = await Department.countDocuments({ parentDepartment: { $ne: null } });
        const totalPositions = await Position.countDocuments();

        console.log(`\n📊 Summary:`);
        console.log(`   Total Departments: ${totalDepartments}`);
        console.log(`   - Main Departments: ${mainDepartments}`);
        console.log(`   - Sub-Departments: ${subDepartments}`);
        console.log(`   Total Positions: ${totalPositions}`);
        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
};

// Run the setup
setupOrganization()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Setup failed:', error);
        process.exit(1);
    });
