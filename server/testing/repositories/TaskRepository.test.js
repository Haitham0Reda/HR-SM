import mongoose from 'mongoose';
import TaskRepository from '../../repositories/modules/TaskRepository.js';
import Task from '../../modules/tasks/models/Task.js';
import User from '../../modules/hr-core/users/models/user.model.js';

describe('TaskRepository', () => {
    let taskRepository;
    let testTenantId;
    let testUser1;
    let testUser2;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/hrms_test');
        }
        
        taskRepository = new TaskRepository();
        testTenantId = 'test-tenant-' + Date.now();
    });

    beforeEach(async () => {
        await Task.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });

        testUser1 = await User.create({
            tenantId: testTenantId,
            email: 'user1@example.com',
            password: 'password123',
            firstName: 'User',
            lastName: 'One',
            employeeId: 'EMP001'
        });

        testUser2 = await User.create({
            tenantId: testTenantId,
            email: 'user2@example.com',
            password: 'password123',
            firstName: 'User',
            lastName: 'Two',
            employeeId: 'EMP002'
        });
    });

    afterAll(async () => {
        await Task.deleteMany({ tenantId: testTenantId });
        await User.deleteMany({ tenantId: testTenantId });
    });

    describe('findByAssignedTo', () => {
        it('should find tasks assigned to user', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'Test Task 1',
                description: 'Description 1',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Test Task 2',
                description: 'Description 2',
                assignedTo: testUser2._id,
                assignedBy: testUser1._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            const tasks = await taskRepository.findByAssignedTo(testUser1._id, {
                tenantId: testTenantId
            });

            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Test Task 1');
        });
    });

    describe('findByAssignedBy', () => {
        it('should find tasks assigned by user', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'Test Task 1',
                description: 'Description 1',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            const tasks = await taskRepository.findByAssignedBy(testUser2._id, {
                tenantId: testTenantId
            });

            expect(tasks).toHaveLength(1);
            expect(tasks[0].title).toBe('Test Task 1');
        });
    });

    describe('findByStatus', () => {
        it('should find tasks by status', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'Assigned Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Completed Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'completed'
            });

            const assignedTasks = await taskRepository.findByStatus('assigned', {
                tenantId: testTenantId
            });

            expect(assignedTasks).toHaveLength(1);
            expect(assignedTasks[0].status).toBe('assigned');
        });
    });

    describe('findByPriority', () => {
        it('should find tasks by priority', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'High Priority Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                priority: 'high'
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Low Priority Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                priority: 'low'
            });

            const highPriorityTasks = await taskRepository.findByPriority('high', {
                tenantId: testTenantId
            });

            expect(highPriorityTasks).toHaveLength(1);
            expect(highPriorityTasks[0].priority).toBe('high');
        });
    });

    describe('findOverdueTasks', () => {
        it('should find overdue tasks', async () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

            await Task.create({
                tenantId: testTenantId,
                title: 'Overdue Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                dueDate: pastDate,
                status: 'assigned'
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Future Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            const overdueTasks = await taskRepository.findOverdueTasks({
                tenantId: testTenantId
            });

            expect(overdueTasks).toHaveLength(1);
            expect(overdueTasks[0].title).toBe('Overdue Task');
        });
    });

    describe('findTasksDueSoon', () => {
        it('should find tasks due soon', async () => {
            const soonDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

            await Task.create({
                tenantId: testTenantId,
                title: 'Due Soon Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: soonDate,
                status: 'assigned'
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Far Future Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            const dueSoonTasks = await taskRepository.findTasksDueSoon(7, {
                tenantId: testTenantId
            });

            expect(dueSoonTasks).toHaveLength(1);
            expect(dueSoonTasks[0].title).toBe('Due Soon Task');
        });
    });

    describe('findByTags', () => {
        it('should find tasks by tags', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'Tagged Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: ['urgent', 'development']
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Other Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: ['testing']
            });

            const urgentTasks = await taskRepository.findByTags(['urgent'], {
                tenantId: testTenantId
            });

            expect(urgentTasks).toHaveLength(1);
            expect(urgentTasks[0].title).toBe('Tagged Task');
        });
    });

    describe('updateTaskStatus', () => {
        it('should update task status', async () => {
            const task = await Task.create({
                tenantId: testTenantId,
                title: 'Test Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: 'assigned'
            });

            const updatedTask = await taskRepository.updateTaskStatus(
                task._id,
                'completed'
            );

            expect(updatedTask.status).toBe('completed');
            expect(updatedTask.completedAt).toBeTruthy();
        });
    });

    describe('addAttachment', () => {
        it('should add attachment to task', async () => {
            const task = await Task.create({
                tenantId: testTenantId,
                title: 'Test Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                attachments: []
            });

            const attachment = {
                filename: 'document.pdf',
                path: '/uploads/document.pdf',
                size: 1024
            };

            const updatedTask = await taskRepository.addAttachment(
                task._id,
                attachment
            );

            expect(updatedTask.attachments).toHaveLength(1);
            expect(updatedTask.attachments[0].filename).toBe('document.pdf');
        });
    });

    describe('addTags', () => {
        it('should add tags to task', async () => {
            const task = await Task.create({
                tenantId: testTenantId,
                title: 'Test Task',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: ['existing']
            });

            const updatedTask = await taskRepository.addTags(
                task._id,
                ['new', 'urgent']
            );

            expect(updatedTask.tags).toHaveLength(3);
            expect(updatedTask.tags).toContain('existing');
            expect(updatedTask.tags).toContain('new');
            expect(updatedTask.tags).toContain('urgent');
        });
    });

    describe('getAllTags', () => {
        it('should get all unique tags', async () => {
            await Task.create({
                tenantId: testTenantId,
                title: 'Task 1',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: ['urgent', 'development']
            });

            await Task.create({
                tenantId: testTenantId,
                title: 'Task 2',
                description: 'Description',
                assignedTo: testUser1._id,
                assignedBy: testUser2._id,
                startDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                tags: ['testing', 'urgent']
            });

            const allTags = await taskRepository.getAllTags({
                tenantId: testTenantId
            });

            expect(allTags).toHaveLength(3);
            expect(allTags).toContain('urgent');
            expect(allTags).toContain('development');
            expect(allTags).toContain('testing');
        });
    });
});