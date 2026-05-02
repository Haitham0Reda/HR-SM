import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import User from '../../modules/hr-core/users/models/user.model.js';

class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    async findByDepartment(departmentId, options = {}) {
        try {
            return await this.findAll({ departmentId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    async findByRole(role, options = {}) {
        try {
            return await this.findAll({ role }, options);
        } catch (error) {
            throw this._handleError(error, 'findByRole');
        }
    }

    async findByStatus(status, options = {}) {
        try {
            return await this.findAll({ status }, options);
        } catch (error) {
            throw this._handleError(error, 'findByStatus');
        }
    }

    async findByEmail(email, options = {}) {
        try {
            const { tenantId, includePassword = false } = options;
            const where = { email: email.toLowerCase() };
            if (tenantId) where.tenantId = tenantId;

            const findOptions = { where };
            if (includePassword) {
                findOptions.attributes = { include: ['password'] };
            }

            return await this.model.findOne(findOptions);
        } catch (error) {
            throw this._handleError(error, 'findByEmail');
        }
    }

    async findByUsername(username, options = {}) {
        try {
            const { tenantId, includePassword = false } = options;
            const where = { username };
            if (tenantId) where.tenantId = tenantId;

            const findOptions = { where };
            if (includePassword) {
                findOptions.attributes = { include: ['password'] };
            }

            return await this.model.findOne(findOptions);
        } catch (error) {
            throw this._handleError(error, 'findByUsername');
        }
    }

    async findByEmployeeId(employeeId, options = {}) {
        try {
            return await this.findOne({ employeeId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByEmployeeId');
        }
    }

    async findActiveUsers(options = {}) {
        try {
            return await this.findAll({ isActive: true, status: 'active' }, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveUsers');
        }
    }

    async findByEmploymentStatus(employmentStatus, options = {}) {
        try {
            // employment is a JSONB field; query with Sequelize JSON path
            const where = {
                employment: { employmentStatus }
            };
            return await this.findAll(where, options);
        } catch (error) {
            throw this._handleError(error, 'findByEmploymentStatus');
        }
    }

    async findByHireDateRange(startDate, endDate, options = {}) {
        try {
            // hireDate is nested in the employment JSONB field
            const { tenantId } = options;
            const tenantFilter = tenantId ? `AND tenant_id = :tenantId` : '';
            const results = await this.model.sequelize.query(
                `SELECT * FROM users
                 WHERE (employment->>'hireDate')::timestamp >= :startDate
                   AND (employment->>'hireDate')::timestamp <= :endDate
                   ${tenantFilter}`,
                {
                    replacements: { startDate, endDate, ...(tenantId ? { tenantId } : {}) },
                    type: QueryTypes.SELECT,
                    model: this.model,
                    mapToModel: true
                }
            );
            return results;
        } catch (error) {
            throw this._handleError(error, 'findByHireDateRange');
        }
    }

    async searchUsers(searchTerm, options = {}) {
        try {
            const term = `%${searchTerm}%`;
            const filter = {
                [Op.or]: [
                    { firstName: { [Op.iLike]: term } },
                    { lastName: { [Op.iLike]: term } },
                    { email: { [Op.iLike]: term } },
                    { username: { [Op.iLike]: term } },
                    { employeeId: { [Op.iLike]: term } }
                ]
            };
            return await this.findAll(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchUsers');
        }
    }

    async getUserStatsByDepartment(options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `WHERE tenant_id = :tenantId` : '';
            const rows = await this.model.sequelize.query(
                `SELECT
                   department_id                                          AS "departmentId",
                   COUNT(*)                                               AS "totalUsers",
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)    AS "activeUsers",
                   SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END)   AS "inactiveUsers"
                 FROM users
                 ${tenantFilter}
                 GROUP BY department_id`,
                {
                    replacements: tenantId ? { tenantId } : {},
                    type: QueryTypes.SELECT
                }
            );
            return rows;
        } catch (error) {
            throw this._handleError(error, 'getUserStatsByDepartment');
        }
    }

    async getUserStatsByRole(options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `WHERE tenant_id = :tenantId` : '';
            const rows = await this.model.sequelize.query(
                `SELECT
                   role,
                   COUNT(*)                                              AS "totalUsers",
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)   AS "activeUsers"
                 FROM users
                 ${tenantFilter}
                 GROUP BY role
                 ORDER BY "totalUsers" DESC`,
                {
                    replacements: tenantId ? { tenantId } : {},
                    type: QueryTypes.SELECT
                }
            );
            return rows;
        } catch (error) {
            throw this._handleError(error, 'getUserStatsByRole');
        }
    }

    async updateLastLogin(userId, options = {}) {
        try {
            return await this.update(userId, { lastLogin: new Date() }, options);
        } catch (error) {
            throw this._handleError(error, 'updateLastLogin');
        }
    }

    async updatePassword(userId, newPassword, options = {}) {
        try {
            return await this.update(userId, { password: newPassword }, options);
        } catch (error) {
            throw this._handleError(error, 'updatePassword');
        }
    }

    async findWithDetails(filter = {}, options = {}) {
        try {
            return await this.findAll(filter, options);
        } catch (error) {
            throw this._handleError(error, 'findWithDetails');
        }
    }
}

export default UserRepository;
