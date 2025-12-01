import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create sample data for the template with ALL user fields
const templateData = [
    {
        // Required Fields
        username: 'john.doe',
        email: 'john.doe@example.com',
        password: 'Password123',

        // Basic Info
        role: 'employee',
        status: 'active',
        employeeId: 'EMID-0001',

        // Personal Information
        fullName: 'John Michael Doe',
        firstName: 'John',
        medName: 'Michael',
        lastName: 'Doe',
        arabicName: 'جون مايكل دو',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        nationality: 'American',
        nationalId: '123456789',
        phone: '+1234567890',
        address: '123 Main Street, New York, NY 10001',
        maritalStatus: 'single',

        // Employment Information
        hireDate: '2020-01-15',
        contractType: 'full-time',
        employmentStatus: 'active',

        // Vacation Balance
        annualTotal: 21,
        annualUsed: 5,
        casualTotal: 7,
        casualUsed: 2,
        flexibleTotal: 3,
        flexibleUsed: 0
    },
    {
        // Required Fields
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        password: 'Password456',

        // Basic Info
        role: 'admin',
        status: 'active',
        employeeId: 'EMID-0002',

        // Personal Information
        fullName: 'Jane Elizabeth Smith',
        firstName: 'Jane',
        medName: 'Elizabeth',
        lastName: 'Smith',
        arabicName: 'جين إليزابيث سميث',
        dateOfBirth: '1992-05-20',
        gender: 'female',
        nationality: 'British',
        nationalId: '987654321',
        phone: '+0987654321',
        address: '456 Oak Avenue, London, UK',
        maritalStatus: 'married',

        // Employment Information
        hireDate: '2019-03-10',
        contractType: 'full-time',
        employmentStatus: 'active',

        // Vacation Balance
        annualTotal: 25,
        annualUsed: 10,
        casualTotal: 7,
        casualUsed: 3,
        flexibleTotal: 5,
        flexibleUsed: 2
    },
    {
        // Required Fields
        username: 'ahmed.hassan',
        email: 'ahmed.hassan@example.com',
        password: 'Password789',

        // Basic Info
        role: 'manager',
        status: 'active',
        employeeId: 'EMID-0003',

        // Personal Information
        fullName: 'Ahmed Hassan Ali',
        firstName: 'Ahmed',
        medName: 'Hassan',
        lastName: 'Ali',
        arabicName: 'أحمد حسن علي',
        dateOfBirth: '1988-08-25',
        gender: 'male',
        nationality: 'Egyptian',
        nationalId: '28808251234567',
        phone: '+201234567890',
        address: 'Cairo, Egypt',
        maritalStatus: 'married',

        // Employment Information
        hireDate: '2018-06-01',
        contractType: 'full-time',
        employmentStatus: 'active',

        // Vacation Balance
        annualTotal: 30,
        annualUsed: 15,
        casualTotal: 7,
        casualUsed: 5,
        flexibleTotal: 10,
        flexibleUsed: 4
    }
];

// Create workbook and worksheet
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(templateData);

// Set column widths for better readability
worksheet['!cols'] = [
    { wch: 15 }, // username
    { wch: 30 }, // email
    { wch: 15 }, // password
    { wch: 12 }, // role
    { wch: 12 }, // status
    { wch: 15 }, // employeeId
    { wch: 25 }, // fullName
    { wch: 15 }, // firstName
    { wch: 15 }, // medName
    { wch: 15 }, // lastName
    { wch: 25 }, // arabicName
    { wch: 12 }, // dateOfBirth
    { wch: 10 }, // gender
    { wch: 15 }, // nationality
    { wch: 18 }, // nationalId
    { wch: 15 }, // phone
    { wch: 40 }, // address
    { wch: 15 }, // maritalStatus
    { wch: 12 }, // hireDate
    { wch: 15 }, // contractType
    { wch: 18 }, // employmentStatus
    { wch: 12 }, // annualTotal
    { wch: 12 }, // annualUsed
    { wch: 12 }, // casualTotal
    { wch: 12 }, // casualUsed
    { wch: 12 }, // flexibleTotal
    { wch: 12 }  // flexibleUsed
];

// Add worksheet to workbook
xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');

// Ensure templates directory exists
const templatesDir = path.join(__dirname, '../../client/public/templates');
if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
}

// Write to file
const outputPath = path.join(templatesDir, 'bulk-users-template.xlsx');
xlsx.writeFile(workbook, outputPath);

console.log('✅ Bulk users template created successfully at:', outputPath);
console.log('📋 Template includes 3 sample users with ALL available fields:');
console.log('   - Required: username, email, password');
console.log('   - Basic: role, status, employeeId');
console.log('   - Personal: fullName, firstName, medName, lastName, arabicName, dateOfBirth, gender, nationality, nationalId, phone, address, maritalStatus');
console.log('   - Employment: hireDate, contractType, employmentStatus');
console.log('   - Vacation: annualTotal, annualUsed, casualTotal, casualUsed, flexibleTotal, flexibleUsed');
