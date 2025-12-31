import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app, { initializeRoutes } from '../../../app.js';
import User from '../../hr-core/users/models/user.model.js';
import TenantConfig from '../../hr-core/models/TenantConfig.js';
import Task from '../models/Task.js';
import TaskReport from '../models/TaskReport.js';
import jwt from 'jsonwebtoken';

let mongoServer;
let managerToken, employeeToken;
let managerId, employeeId;
const tenantId = 'test-tenant';

beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Initialize routes
    await initializeRoutes();

    // Create tenant config
    await TenantConfig.create({
        tenantId,
        companyName: 'Test Company',
        deploymentMode: 'saas',
        modules: new Map([
            ['hr-core', { enabled: true }],
            ['tasks', { enabled: true }]
        ])
    });

    // Create test users
    const manager = await User.create({
        email: 'manager@test.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'Manager',
        tenantId
    });
    managerId = manager._id;

    const employee = await User.create({
        email: 'employee@test.com',
        password: 'password123',
        firstName: 'Employee',
        lastName: 'User',
        role: 'Employee',
        tenantId,
        manager: managerId
    });
    employeeId = employee._id;

    // Generate tokens
    managerToken = jwt.sign(
        { id: managerId.toString(), email: manager.email, role: 'Manager', tenantId },
        process.env.JWT_SECRET || 'test-secret'
    );

    employeeToken = jwt.sign(
        { id: employeeId.toString(), email: employee.email, role: 'Employee', tenantId },
        process.env.JWT_SECRET || 'test-secret'
    );
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Task Module', () => {
    describe('POST /api/v1/tasks/tasks', () => {
        it('should create a task as manager', async () => {
            const taskData = {
                title: 'Test Task',
                description: 'This is a test task description',
                priority: 'high',
                assignedTo: employeeId.toString(),
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };

            const response = await request(app)
                .post('/api/v1/tasks/tasks')
                .set('Authorization', `Bearer ${managerToken}`)
                .send(taskData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe(taskData.title);
            expect(response.body.data.status).toBe('assigned');
        });

        it('should not allow employee to create task', async () => {
            const taskData = {
                title: 'Test Task',
                description: 'This is a test task description',
                priority: 'medium',
                assignedTo: employeeId.toString(),
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };

            await request(app)
                .post('/api/v1/tasks/tasks')
                .set('Authorization', `Bearer ${employeeToken}`)
                .send(taskData)
                .expect(403);
        });

        it('should validate due date is after start date', async () => {
            const taskData = {
                title: 'Invalid Task',
                description: 'This task has invalid dates',
                priority: 'low',
                assignedTo: employeeId.toString(),
                startDate: new Date(),
                dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Yesterday
            };

            await request(app)
                .post('/api/v1/tasks/tasks')
                .set('Authorization', `Bearer ${managerToken}`)
                .send(taskData)
                .expect(400);
        });
    });

    describe('GET /api/v1/tasks/tasks', () => {
        beforeEach(async () => {
            await Task.deleteMany({});

            // Create test tasks
            await Task.create({
                title: 'Task 1',
                description: 'Description 1',
                priority: 'high',
                assignedTo: employeeId,
                assignedBy: managerId,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tenantId
            });
        });

        it('should get tasks for employee (only assigned to them)', async () => {
            const response = await request(app)
                .get('/api/v1/tasks/tasks')
                .set('Authorization', `Bearer ${employeeToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it('should get tasks for manager', async () => {
            const response = await request(app)
                .get('/api/v1/tasks/tasks')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should filter tasks by status', async () => {
            const response = await request(app)
                .get('/api/v1/tasks/tasks?status=assigned')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            response.body.data.forEach(task => {
                expect(task.status).toBe('assigned');
            });
        });
    });

    describe('PATCH /api/v1/tasks/tasks/:id/status', () => {
        let taskId;

        beforeEach(async () => {
            const task = await Task.create({
                title: 'Status Test Task',
                description: 'Testing status updates',
                priority: 'medium',
                assignedTo: employeeId,
                assignedBy: managerId,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tenantId
            });
            taskId = task._id;
        });

        it('should allow employee to start assigned task', async () => {
            const response = await request(app)
                .patch(`/api/v1/tasks/tasks/${taskId}/status`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ status: 'in-progress' })
                .expect(200);

            expect(response.body.data.status).toBe('in-progress');
        });

        it('should not allow invalid status transition', async () => {
            await request(app)
                .patch(`/api/v1/tasks/tasks/${taskId}/status`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({ status: 'completed' })
                .expect(400);
        });

        it('should not allow manager to update employee task status', async () => {
            await request(app)
                .patch(`/api/v1/tasks/tasks/${taskId}/status`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ status: 'in-progress' })
                .expect(403);
        });
    });

    describe('Task Report Submission', () => {
        let taskId;

        beforeEach(async () => {
            const task = await Task.create({
                title: 'Report Test Task',
                description: 'Testing report submission',
                priority: 'medium',
                assignedTo: employeeId,
                assignedBy: managerId,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'in-progress',
                tenantId
            });
            taskId = task._id;
        });

        it('should allow employee to submit report', async () => {
            const reportData = {
                reportText: 'This is a detailed report of the work completed. It includes all the necessary information about the task completion and outcomes achieved.',
                timeSpent: JSON.stringify({ hours: 5, minutes: 30 })
            };

            const response = await request(app)
                .post(`/api/v1/tasks/reports/task/${taskId}`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .field('reportText', reportData.reportText)
                .field('timeSpent', reportData.timeSpent)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.reportText).toBe(reportData.reportText);
            expect(response.body.data.status).toBe('pending');

            // Verify task status updated
            const task = await Task.findById(taskId);
            expect(task.status).toBe('submitted');
        });

        it('should reject report with insufficient text', async () => {
            await request(app)
                .post(`/api/v1/tasks/reports/task/${taskId}`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .field('reportText', 'Too short')
                .expect(400);
        });

        it('should not allow manager to submit report for employee task', async () => {
            const reportData = {
                reportText: 'This is a detailed report that meets the minimum character requirement for submission.',
                timeSpent: JSON.stringify({ hours: 3, minutes: 0 })
            };

            await request(app)
                .post(`/api/v1/tasks/reports/task/${taskId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .field('reportText', reportData.reportText)
                .field('timeSpent', reportData.timeSpent)
                .expect(403);
        });
    });

    describe('Report Review', () => {
        let taskId, reportId;

        beforeEach(async () => {
            const task = await Task.create({
                title: 'Review Test Task',
                description: 'Testing report review',
                priority: 'medium',
                assignedTo: employeeId,
                assignedBy: managerId,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'submitted',
                tenantId
            });
            taskId = task._id;

            const report = await TaskReport.create({
                task: taskId,
                submittedBy: employeeId,
                reportText: 'This is a comprehensive report detailing all the work completed for this task.',
                status: 'pending',
                tenantId
            });
            reportId = report._id;
        });

        it('should allow manager to approve report', async () => {
            const response = await request(app)
                .patch(`/api/v1/tasks/reports/${reportId}/review`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    action: 'approve',
                    comments: 'Great work!'
                })
                .expect(200);

            expect(response.body.data.status).toBe('approved');

            // Verify task status updated
            const task = await Task.findById(taskId);
            expect(task.status).toBe('completed');
            expect(task.completedAt).toBeDefined();
        });

        it('should allow manager to reject report', async () => {
            const response = await request(app)
                .patch(`/api/v1/tasks/reports/${reportId}/review`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    action: 'reject',
                    comments: 'Please provide more details'
                })
                .expect(200);

            expect(response.body.data.status).toBe('rejected');

            // Verify task status updated
            const task = await Task.findById(taskId);
            expect(task.status).toBe('rejected');
        });

        it('should not allow employee to review their own report', async () => {
            await request(app)
                .patch(`/api/v1/tasks/reports/${reportId}/review`)
                .set('Authorization', `Bearer ${employeeToken}`)
                .send({
                    action: 'approve',
                    comments: 'Approving my own work'
                })
                .expect(403);
        });
    });

    describe('Task Analytics', () => {
        beforeEach(async () => {
            await Task.deleteMany({});

            // Create various tasks for analytics
            await Task.create([
                {
                    title: 'Completed Task',
                    description: 'Desc',
                    priority: 'high',
                    status: 'completed',
                    assignedTo: employeeId,
                    assignedBy: managerId,
                    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    tenantId
                },
                {
                    title: 'In Progress Task',
                    description: 'Desc',
                    priority: 'medium',
                    status: 'in-progress',
                    assignedTo: employeeId,
                    assignedBy: managerId,
                    startDate: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    tenantId
                }
            ]);
        });

        it('should get task analytics', async () => {
            const response = await request(app)
                .get('/api/v1/tasks/tasks/analytics')
                .set('Authorization', `Bearer ${managerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('statusDistribution');
            expect(response.body.data).toHaveProperty('priorityDistribution');
            expect(response.body.data).toHaveProperty('completionRate');
        });
    });
});
