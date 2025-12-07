import mongoose from 'mongoose';
import Task from '../models/task.model.js';
import TaskReport from '../models/taskReport.model.js';

// Use the existing test database setup
// Tests will use the existing MongoDB connection from the test environment

describe('Task Model', () => {
    // Clear the database before each test
    beforeEach(async () => {
        await Task.deleteMany({});
        await TaskReport.deleteMany({});
    });

    it('should create and save a task successfully', async () => {
        const taskData = {
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'medium',
            assignee: new mongoose.Types.ObjectId(),
            assigner: new mongoose.Types.ObjectId(),
            startDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'assigned',
            tenantId: 'test-tenant'
        };

        const task = new Task(taskData);
        const savedTask = await task.save();

        expect(savedTask._id).toBeDefined();
        expect(savedTask.title).toBe(taskData.title);
        expect(savedTask.description).toBe(taskData.description);
        expect(savedTask.priority).toBe(taskData.priority);
        expect(savedTask.status).toBe(taskData.status);
        expect(savedTask.tenantId).toBe(taskData.tenantId);
    });

    it('should fail to create task without required fields', async () => {
        const taskData = {
            description: 'Missing title',
            tenantId: 'test-tenant'
        };

        let err;
        try {
            const task = new Task(taskData);
            await task.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeDefined();
        expect(err.errors.title).toBeDefined();
    });
});

describe('TaskReport Model', () => {
    // Clear the database before each test
    beforeEach(async () => {
        await Task.deleteMany({});
        await TaskReport.deleteMany({});
    });

    it('should create and save a task report successfully', async () => {
        // First create a task
        const taskData = {
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'medium',
            assignee: new mongoose.Types.ObjectId(),
            assigner: new mongoose.Types.ObjectId(),
            startDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'assigned',
            tenantId: 'test-tenant'
        };

        const task = new Task(taskData);
        const savedTask = await task.save();

        const reportData = {
            taskId: savedTask._id,
            reportText: 'Task completed successfully',
            timeSpent: 120,
            status: 'draft',
            tenantId: 'test-tenant'
        };

        const report = new TaskReport(reportData);
        const savedReport = await report.save();

        expect(savedReport._id).toBeDefined();
        expect(savedReport.taskId.toString()).toBe(savedTask._id.toString());
        expect(savedReport.reportText).toBe(reportData.reportText);
        expect(savedReport.timeSpent).toBe(reportData.timeSpent);
        expect(savedReport.status).toBe(reportData.status);
        expect(savedReport.tenantId).toBe(reportData.tenantId);
    });
});