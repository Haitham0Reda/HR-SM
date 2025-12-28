import TaskRepository from '../../../repositories/modules/TaskRepository.js';

/**
 * Task Service - Business logic layer for task operations
 * Uses TaskRepository for data access
 */
class TaskService {
  constructor() {
    this.taskRepository = new TaskRepository();
  }

  /**
   * Get all tasks
   */
  async getAllTasks(tenantId, options = {}) {
    const filter = { tenantId };
    const queryOptions = {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' },
        { path: 'department', select: 'name code' }
      ],
      sort: { createdAt: -1 },
      ...options
    };

    return await this.taskRepository.find(filter, queryOptions);
  }

  /**
   * Create task
   */
  async createTask(taskData, tenantId) {
    const dataToCreate = {
      ...taskData,
      tenantId
    };

    const task = await this.taskRepository.create(dataToCreate);
    
    // Return populated task
    return await this.taskRepository.findById(task._id, {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Get task by ID
   */
  async getTaskById(id, tenantId) {
    const task = await this.taskRepository.findOne(
      { _id: id, tenantId },
      {
        populate: [
          { path: 'assignedTo', select: 'firstName lastName email employeeId' },
          { path: 'assignedBy', select: 'firstName lastName email' },
          { path: 'project', select: 'name code' },
          { path: 'department', select: 'name code' }
        ]
      }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Update task
   */
  async updateTask(id, updateData, tenantId) {
    const task = await this.taskRepository.findOne({ _id: id, tenantId });
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Handle status changes
    if (updateData.status && updateData.status !== task.status) {
      if (updateData.status === 'completed') {
        updateData.completedAt = new Date();
      } else if (updateData.status === 'in_progress' && task.status === 'pending') {
        updateData.startedAt = new Date();
      }
    }

    const updatedTask = await this.taskRepository.update(id, updateData);
    
    // Return populated task
    return await this.taskRepository.findById(id, {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Delete task
   */
  async deleteTask(id, tenantId) {
    const task = await this.taskRepository.findOne({ _id: id, tenantId });
    
    if (!task) {
      throw new Error('Task not found');
    }

    await this.taskRepository.delete(id);
    return { message: 'Task deleted' };
  }

  /**
   * Assign task to employee
   */
  async assignTask(id, assignedTo, assignedBy, tenantId) {
    const task = await this.taskRepository.findOne({ _id: id, tenantId });
    
    if (!task) {
      throw new Error('Task not found');
    }

    const updateData = {
      assignedTo,
      assignedBy,
      assignedAt: new Date(),
      status: 'assigned'
    };

    await this.taskRepository.update(id, updateData);
    
    // Return populated task
    return await this.taskRepository.findById(id, {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Complete task
   */
  async completeTask(id, completedBy, completionNotes, tenantId) {
    const task = await this.taskRepository.findOne({ _id: id, tenantId });
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'completed') {
      throw new Error('Task is already completed');
    }

    const updateData = {
      status: 'completed',
      completedAt: new Date(),
      completedBy,
      completionNotes
    };

    await this.taskRepository.update(id, updateData);
    
    // Return populated task
    return await this.taskRepository.findById(id, {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'completedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' },
        { path: 'department', select: 'name code' }
      ]
    });
  }

  /**
   * Get tasks by employee
   */
  async getTasksByEmployee(employeeId, tenantId, options = {}) {
    return await this.taskRepository.findByAssignee(employeeId, tenantId, options);
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status, tenantId, options = {}) {
    return await this.taskRepository.findByStatus(status, tenantId, options);
  }

  /**
   * Get tasks by priority
   */
  async getTasksByPriority(priority, tenantId, options = {}) {
    return await this.taskRepository.findByPriority(priority, tenantId, options);
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(tenantId, options = {}) {
    return await this.taskRepository.findOverdue(tenantId, options);
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(tenantId, employeeId = null) {
    const filter = { tenantId };
    
    if (employeeId) {
      filter.assignedTo = employeeId;
    }

    const tasks = await this.taskRepository.find(filter);
    
    const statistics = {
      total: tasks.length,
      pending: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      },
      averageCompletionTime: 0
    };

    let totalCompletionTime = 0;
    let completedTasksCount = 0;
    const now = new Date();

    tasks.forEach(task => {
      // Status counts
      statistics[task.status]++;
      
      // Priority counts
      if (task.priority) {
        statistics.byPriority[task.priority]++;
      }
      
      // Overdue count
      if (task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < now) {
        statistics.overdue++;
      }
      
      // Completion time calculation
      if (task.status === 'completed' && task.createdAt && task.completedAt) {
        const completionTime = task.completedAt - task.createdAt;
        totalCompletionTime += completionTime;
        completedTasksCount++;
      }
    });

    if (completedTasksCount > 0) {
      statistics.averageCompletionTime = totalCompletionTime / completedTasksCount;
      // Convert to days
      statistics.averageCompletionTime = statistics.averageCompletionTime / (1000 * 60 * 60 * 24);
    }

    return statistics;
  }

  /**
   * Get tasks due soon
   */
  async getTasksDueSoon(tenantId, days = 7, options = {}) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const filter = {
      tenantId,
      status: { $in: ['pending', 'assigned', 'in_progress'] },
      dueDate: {
        $gte: now,
        $lte: futureDate
      }
    };

    const queryOptions = {
      populate: [
        { path: 'assignedTo', select: 'firstName lastName email employeeId' },
        { path: 'assignedBy', select: 'firstName lastName email' },
        { path: 'project', select: 'name code' }
      ],
      sort: { dueDate: 1 },
      ...options
    };

    return await this.taskRepository.find(filter, queryOptions);
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateTaskStatus(taskIds, status, updatedBy, tenantId) {
    const results = [];
    
    for (const taskId of taskIds) {
      try {
        const updateData = { status };
        
        if (status === 'completed') {
          updateData.completedAt = new Date();
          updateData.completedBy = updatedBy;
        } else if (status === 'in_progress') {
          updateData.startedAt = new Date();
        }

        const task = await this.updateTask(taskId, updateData, tenantId);
        results.push({ success: true, taskId, data: task });
      } catch (error) {
        results.push({ 
          success: false, 
          taskId, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
}

export default TaskService;