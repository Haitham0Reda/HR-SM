import mongoose from 'mongoose';
import UserService from '../../modules/hr-core/services/UserService.js';
import AttendanceService from '../../modules/hr-core/attendance/services/AttendanceService.js';
import PayrollService from '../../modules/payroll/services/PayrollService.js';
import VacationService from '../../modules/hr-core/vacations/services/VacationService.js';
import TaskService from '../../modules/tasks/services/TaskService.js';
import DocumentService from '../../modules/documents/services/DocumentService.js';

// Import models for cleanup
import User from '../../modules/hr-core/users/models/user.model.js';
import Attendance from '../../modules/hr-core/attendance/models/attendance.model.js';
import Payroll from '../../modules/payroll/models/payroll.model.js';
import Vacation from '../../modules/hr-core/vacations/models/vacation.model.js';
import Task from '../../modules/tasks/models/task.model.js';
import Document from '../../modules/documents/models/document.model.js';

describe('Service-Repository Integration Tests', () => {
    let testTenantId;
    let userService;
    let attendanceService;
    let payrollService;
    let vacationService;
    let taskService;
    let documentService;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        testTenantId = 'integration-test-' + Date.now();
        
        // Initialize services
        userService = new UserService();
        attendanceService = new AttendanceService();
        payrollService = new PayrollService();
        vacationService = new VacationService();
        taskService = new TaskService();
        documentService = new DocumentService();
    });

    beforeEach(async () => {
        // Clean up test data before each test
        await User.deleteMany({ tenantId: testTenantId });
        await Attendance.deleteMany({ tenantId: testTenantId });
        await Payroll.deleteMany({ tenantId: testTenantId });
        await Vacation.deleteMany({ tenantId: testTenantId });
        await Task.deleteMany({ tenantId: testTenantId });
        await Document.deleteMany({ tenantId: testTenantId });
    });

    afterAll(async () => {
        // Clean up test data
        await User.deleteMany({ tenantId: testTenantId });
        await Attendance.deleteMany({ tenantId: testTenantId });
        await Payroll.deleteMany({ tenantId: testTenantId });
        await Vacation.deleteMany({ tenantId: testTenantId });
        await Task.deleteMany({ tenantId: testTenantId });
        await Document.deleteMany({ tenantId: testTenantId });
    });

    describe('UserService Integration', () => {
        it('should create, read, update, and delete users through service layer', async () => {
            // Create user
            const userData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                employeeId: 'EMP001',
                role: 'employee',
                status: 'active'
            };

            const createdUser = await userService.createUser(userData, 'creator123', testTenantId);
            expect(createdUser).toBeDefined();
            expect(createdUser.firstName).toBe('John');
            expect(createdUser.tenantId).toBe(testTenantId);

            // Read user
            const fetchedUser = await userService.getUserById(createdUser._id, testTenantId);
            expect(fetchedUser).toBeDefined();
            expect(fetchedUser.email).toBe('john.doe@example.com');

            // Update user
            const updateData = { firstName: 'Jane' };
            const updatedUser = await userService.updateUser(createdUser._id, updateData, 'updater123', testTenantId);
            expect(updatedUser.firstName).toBe('Jane');

            // Delete user (soft delete)
            const deleteResult = await userService.deleteUser(createdUser._id, 'deleter123', testTenantId);
            expect(deleteResult.message).toBe('User deactivated successfully');

            // Verify user is soft deleted
            const deletedUser = await userService.getUserById(createdUser._id, testTenantId);
            expect(deletedUser.status).toBe('inactive');
        });

        it('should get users with filters and pagination', async () => {
            // Create multiple users
            const users = [
                { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', role: 'employee', status: 'active' },
                { firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com', role: 'manager', status: 'active' },
                { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', role: 'employee', status: 'inactive' }
            ];

            for (const userData of users) {
                await userService.createUser(userData, 'creator123', testTenantId);
            }

            // Test filtering by role
            const result = await userService.getUsers({ role: 'employee', tenantId: testTenantId });
            expect(result.users).toHaveLength(2);
            expect(result.pagination.total).toBe(2);

            // Test filtering by status
            const activeResult = await userService.getUsers({ status: 'active', tenantId: testTenantId });
            expect(activeResult.users).toHaveLength(2);

            // Test search
            const searchResult = await userService.getUsers({ search: 'alice', tenantId: testTenantId });
            expect(searchResult.users).toHaveLength(1);
            expect(searchResult.users[0].firstName).toBe('Alice');
        });
    });

    describe('AttendanceService Integration', () => {
        let testUser;

        beforeEach(async () => {
            // Create a test user for attendance records
            testUser = await userService.createUser({
                firstName: 'Test',
                lastName: 'Employee',
                email: 'test.employee@example.com',
                employeeId: 'EMP002',
                role: 'employee',
                status: 'active'
            }, 'creator123', testTenantId);
        });

        it('should create and manage attendance records through service layer', async () => {
            // Create attendance
            const attendanceData = {
                employee: testUser._id,
                date: new Date(),
                checkIn: { time: new Date(), method: 'manual' },
                status: 'present'
            };

            const createdAttendance = await attendanceService.createAttendance(attendanceData, testTenantId);
            expect(createdAttendance).toBeDefined();
            expect(createdAttendance.employee).toBeDefined();
            expect(createdAttendance.tenantId).toBe(testTenantId);

            // Read attendance
            const fetchedAttendance = await attendanceService.getAttendanceById(createdAttendance._id, testTenantId);
            expect(fetchedAttendance).toBeDefined();
            expect(fetchedAttendance.status).toBe('present');

            // Update attendance
            const updateData = { status: 'late' };
            const updatedAttendance = await attendanceService.updateAttendance(createdAttendance._id, updateData, testTenantId);
            expect(updatedAttendance.status).toBe('late');

            // Delete attendance
            const deleteResult = await attendanceService.deleteAttendance(createdAttendance._id, testTenantId);
            expect(deleteResult.message).toBe('Attendance deleted');
        });

        it('should get today\'s attendance with summary', async () => {
            // Create multiple attendance records for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const attendanceRecords = [
                {
                    employee: testUser._id,
                    date: today,
                    checkIn: { time: new Date(), isLate: false },
                    checkOut: { isEarly: false },
                    status: 'present'
                }
            ];

            for (const record of attendanceRecords) {
                await attendanceService.createAttendance(record, testTenantId);
            }

            const result = await attendanceService.getTodayAttendance(testTenantId);
            expect(result).toHaveProperty('date');
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('data');
            expect(result.summary.total).toBeGreaterThan(0);
        });
    });

    describe('PayrollService Integration', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await userService.createUser({
                firstName: 'Payroll',
                lastName: 'Employee',
                email: 'payroll.employee@example.com',
                employeeId: 'EMP003',
                role: 'employee',
                status: 'active'
            }, 'creator123', testTenantId);
        });

        it('should create and manage payroll records through service layer', async () => {
            // Create payroll
            const payrollData = {
                employee: testUser._id,
                period: '2024-01',
                grossSalary: 5000,
                netSalary: 4000,
                totalDeductions: 1000
            };

            const createdPayroll = await payrollService.createPayroll(payrollData, testTenantId);
            expect(createdPayroll).toBeDefined();
            expect(createdPayroll.grossSalary).toBe(5000);
            expect(createdPayroll.tenantId).toBe(testTenantId);

            // Read payroll
            const fetchedPayroll = await payrollService.getPayrollById(createdPayroll._id, testTenantId);
            expect(fetchedPayroll).toBeDefined();
            expect(fetchedPayroll.period).toBe('2024-01');

            // Update payroll
            const updateData = { grossSalary: 5500, netSalary: 4400 };
            const updatedPayroll = await payrollService.updatePayroll(createdPayroll._id, updateData, testTenantId);
            expect(updatedPayroll.grossSalary).toBe(5500);

            // Delete payroll
            const deleteResult = await payrollService.deletePayroll(createdPayroll._id, testTenantId);
            expect(deleteResult.message).toBe('Payroll deleted');
        });
    });

    describe('VacationService Integration', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await userService.createUser({
                firstName: 'Vacation',
                lastName: 'Employee',
                email: 'vacation.employee@example.com',
                employeeId: 'EMP004',
                role: 'employee',
                status: 'active'
            }, 'creator123', testTenantId);
        });

        it('should create and manage vacation requests through service layer', async () => {
            // Create vacation
            const vacationData = {
                employee: testUser._id,
                type: 'annual',
                startDate: new Date('2024-06-01'),
                endDate: new Date('2024-06-05'),
                duration: 5,
                reason: 'Family vacation',
                status: 'pending'
            };

            const createdVacation = await vacationService.createVacation(vacationData, testTenantId);
            expect(createdVacation).toBeDefined();
            expect(createdVacation.duration).toBe(5);
            expect(createdVacation.tenantId).toBe(testTenantId);

            // Read vacation
            const fetchedVacation = await vacationService.getVacationById(createdVacation._id, testTenantId);
            expect(fetchedVacation).toBeDefined();
            expect(fetchedVacation.type).toBe('annual');

            // Approve vacation
            const approvedVacation = await vacationService.approveVacation(createdVacation._id, 'approver123', testTenantId);
            expect(approvedVacation.status).toBe('approved');

            // Delete vacation
            const deleteResult = await vacationService.deleteVacation(createdVacation._id, testTenantId);
            expect(deleteResult.message).toBe('Vacation request deleted');
        });
    });

    describe('TaskService Integration', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await userService.createUser({
                firstName: 'Task',
                lastName: 'Employee',
                email: 'task.employee@example.com',
                employeeId: 'EMP005',
                role: 'employee',
                status: 'active'
            }, 'creator123', testTenantId);
        });

        it('should create and manage tasks through service layer', async () => {
            // Create task
            const taskData = {
                title: 'Test Task',
                description: 'This is a test task',
                assignedTo: testUser._id,
                assignedBy: 'manager123',
                priority: 'medium',
                status: 'pending',
                dueDate: new Date('2024-12-31')
            };

            const createdTask = await taskService.createTask(taskData, testTenantId);
            expect(createdTask).toBeDefined();
            expect(createdTask.title).toBe('Test Task');
            expect(createdTask.tenantId).toBe(testTenantId);

            // Read task
            const fetchedTask = await taskService.getTaskById(createdTask._id, testTenantId);
            expect(fetchedTask).toBeDefined();
            expect(fetchedTask.description).toBe('This is a test task');

            // Update task
            const updateData = { status: 'in_progress', title: 'Updated Task' };
            const updatedTask = await taskService.updateTask(createdTask._id, updateData, testTenantId);
            expect(updatedTask.status).toBe('in_progress');
            expect(updatedTask.title).toBe('Updated Task');

            // Complete task
            const completedTask = await taskService.completeTask(createdTask._id, 'completer123', 'Task completed successfully', testTenantId);
            expect(completedTask.status).toBe('completed');

            // Delete task
            const deleteResult = await taskService.deleteTask(createdTask._id, testTenantId);
            expect(deleteResult.message).toBe('Task deleted');
        });
    });

    describe('DocumentService Integration', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await userService.createUser({
                firstName: 'Document',
                lastName: 'Employee',
                email: 'document.employee@example.com',
                employeeId: 'EMP006',
                role: 'employee',
                status: 'active'
            }, 'creator123', testTenantId);
        });

        it('should create and manage documents through service layer', async () => {
            // Create document
            const documentData = {
                name: 'Test Document',
                description: 'This is a test document',
                category: 'policy',
                type: 'pdf',
                uploadedBy: testUser._id,
                employee: testUser._id,
                status: 'active',
                size: 1024
            };

            const createdDocument = await documentService.createDocument(documentData, testTenantId);
            expect(createdDocument).toBeDefined();
            expect(createdDocument.name).toBe('Test Document');
            expect(createdDocument.tenantId).toBe(testTenantId);

            // Read document
            const fetchedDocument = await documentService.getDocumentById(createdDocument._id, testTenantId);
            expect(fetchedDocument).toBeDefined();
            expect(fetchedDocument.category).toBe('policy');

            // Update document
            const updateData = { status: 'archived', description: 'Updated description' };
            const updatedDocument = await documentService.updateDocument(createdDocument._id, updateData, testTenantId);
            expect(updatedDocument.status).toBe('archived');
            expect(updatedDocument.description).toBe('Updated description');

            // Delete document
            const deleteResult = await documentService.deleteDocument(createdDocument._id, testTenantId);
            expect(deleteResult.message).toBe('Document deleted');
        });
    });
});