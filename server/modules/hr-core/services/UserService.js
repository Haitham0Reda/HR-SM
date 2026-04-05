import UserRepository from '../../../repositories/core/UserRepository.js';
import AuditLog from '../models/AuditLog.js';
import { Op } from 'sequelize';

/**
 * User Service - Business logic layer for user operations
 * Uses UserRepository for data access
 */
class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get all users with filtering and pagination
   */
  async getUsers(filters = {}, options = {}) {
    const { role, status, department, page = 1, limit = 20, search, tenantId } = filters;

    const filter = { tenantId };

    if (role) filter.role = role;
    if (status) filter.status = status;
    if (department) filter.department = department;

    if (search) {
      filter[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { employeeId: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const queryOptions = {
      include: [
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title', 'level'] },
        { association: 'manager', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const users = await this.userRepository.findAll(filter, queryOptions);
    const count = await this.userRepository.count(filter);

    return {
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      }
    };
  }

  /**
   * Get single user by ID
   */
  async getUserById(id, tenantId) {
    const user = await this.userRepository.findOne(
      { id, tenantId },
      {
        include: [
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title', 'level'] },
          { association: 'manager', attributes: ['firstName', 'lastName', 'email'] }
        ]
      }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Create new user
   */
  async createUser(userData, createdBy, tenantId) {
    const userToCreate = {
      ...userData,
      tenantId,
      createdBy
    };

    const user = await this.userRepository.create(userToCreate);

    // Create audit log
    await AuditLog.create({
      action: 'create',
      resource: 'User',
      resourceId: user.id,
      userId: createdBy,
      tenantId,
      module: 'hr-core'
    });

    // Populate the created user
    return await this.userRepository.findById(user.id, {
      include: [
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title', 'level'] }
      ]
    });
  }

  /**
   * Update user
   */
  async updateUser(id, updateData, updatedBy, tenantId) {
    const user = await this.userRepository.findOne({ id, tenantId });

    if (!user) {
      throw new Error('User not found');
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'dateOfBirth',
      'department', 'position', 'manager', 'role',
      'status', 'employeeId', 'hireDate', 'address'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    updates.updatedBy = updatedBy;

    const updatedUser = await this.userRepository.update(id, updates);

    // Create audit log
    await AuditLog.create({
      action: 'update',
      resource: 'User',
      resourceId: id,
      userId: updatedBy,
      tenantId,
      module: 'hr-core',
      changes: updates
    });

    // Return populated user
    return await this.userRepository.findById(id, {
      include: [
        { association: 'department', attributes: ['name', 'code'] },
        { association: 'position', attributes: ['title', 'level'] },
        { association: 'manager', attributes: ['firstName', 'lastName', 'email'] }
      ]
    });
  }

  /**
   * Delete user (soft delete by setting status to inactive)
   */
  async deleteUser(id, deletedBy, tenantId) {
    const user = await this.userRepository.findOne({ id, tenantId });

    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(id, {
      status: 'inactive',
      updatedBy: deletedBy
    });

    // Create audit log
    await AuditLog.create({
      action: 'delete',
      resource: 'User',
      resourceId: id,
      userId: deletedBy,
      tenantId,
      module: 'hr-core'
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Get user's subordinates
   */
  async getSubordinates(managerId, tenantId) {
    return await this.userRepository.findAll(
      {
        manager: managerId,
        tenantId,
        status: 'active'
      },
      {
        include: [
          { association: 'department', attributes: ['name', 'code'] },
          { association: 'position', attributes: ['title', 'level'] }
        ]
      }
    );
  }

  /**
   * Find users by role
   */
  async getUsersByRole(role, tenantId) {
    return await this.userRepository.findByRole(role, tenantId);
  }

  /**
   * Find users by department
   */
  async getUsersByDepartment(departmentId, tenantId) {
    return await this.userRepository.findByDepartment(departmentId, tenantId);
  }

  /**
   * Find users by status
   */
  async getUsersByStatus(status, tenantId) {
    return await this.userRepository.findByStatus(status, tenantId);
  }
}

export default UserService;