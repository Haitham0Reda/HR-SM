import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

class DepartmentRepository extends BaseRepository {
    constructor() {
        super(Department);
    }

    async findByParent(parentDepartmentId, options = {}) {
        try {
            return await this.findAll({ parentDepartmentId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByParent');
        }
    }

    async findRootDepartments(options = {}) {
        try {
            return await this.findAll({ parentDepartmentId: null }, options);
        } catch (error) {
            throw this._handleError(error, 'findRootDepartments');
        }
    }

    async findActiveDepartments(options = {}) {
        try {
            return await this.findAll({ status: 'active' }, options);
        } catch (error) {
            throw this._handleError(error, 'findActiveDepartments');
        }
    }

    async findByCode(code, options = {}) {
        try {
            return await this.findOne({ code: code.toUpperCase() }, options);
        } catch (error) {
            throw this._handleError(error, 'findByCode');
        }
    }

    async findByManager(managerId, options = {}) {
        try {
            return await this.findAll({ managerId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByManager');
        }
    }

    async searchByName(searchTerm, options = {}) {
        try {
            const term = `%${searchTerm}%`;
            const filter = {
                [Op.or]: [
                    { name: { [Op.iLike]: term } },
                    { code: { [Op.iLike]: term } }
                ]
            };
            return await this.findAll(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchByName');
        }
    }

    async getHierarchy(departmentId = null, options = {}) {
        try {
            const { tenantId } = options;
            const where = { parentDepartmentId: departmentId, status: 'active' };
            if (tenantId) where.tenantId = tenantId;

            const departments = await this.model.findAll({
                where,
                order: [['name', 'ASC']]
            });

            for (const dept of departments) {
                dept.dataValues.children = await this.getHierarchy(dept.id, options);
            }

            return departments;
        } catch (error) {
            throw this._handleError(error, 'getHierarchy');
        }
    }

    async getParentChain(departmentId, options = {}) {
        try {
            const chain = [];
            let currentDept = await this.findById(departmentId, options);

            while (currentDept) {
                chain.unshift(currentDept);
                if (currentDept.parentDepartmentId) {
                    currentDept = await this.findById(currentDept.parentDepartmentId, options);
                } else {
                    break;
                }
            }

            return chain;
        } catch (error) {
            throw this._handleError(error, 'getParentChain');
        }
    }

    async getAllDescendants(departmentId, options = {}) {
        try {
            const descendants = [];

            const getChildren = async (parentId) => {
                const children = await this.findByParent(parentId, options);
                for (const child of children) {
                    descendants.push(child);
                    await getChildren(child.id);
                }
            };

            await getChildren(departmentId);
            return descendants;
        } catch (error) {
            throw this._handleError(error, 'getAllDescendants');
        }
    }

    async hasSubDepartments(departmentId, options = {}) {
        try {
            const count = await this.count({ parentDepartmentId: departmentId }, options);
            return count > 0;
        } catch (error) {
            throw this._handleError(error, 'hasSubDepartments');
        }
    }

    async getDepartmentStats(options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `WHERE tenant_id = :tenantId` : '';

            const [stats] = await this.model.sequelize.query(
                `SELECT
                   COUNT(*)                                                         AS "totalDepartments",
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)             AS "activeDepartments",
                   SUM(CASE WHEN parent_department_id IS NULL THEN 1 ELSE 0 END)  AS "rootDepartments",
                   SUM(CASE WHEN manager_id IS NOT NULL THEN 1 ELSE 0 END)        AS "departmentsWithManager"
                 FROM departments
                 ${tenantFilter}`,
                {
                    replacements: tenantId ? { tenantId } : {},
                    type: QueryTypes.SELECT
                }
            );

            return stats || {
                totalDepartments: 0,
                activeDepartments: 0,
                rootDepartments: 0,
                departmentsWithManager: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getDepartmentStats');
        }
    }

    async findWithEmployeeCounts(options = {}) {
        try {
            const { tenantId, limit, offset } = options;
            const tenantFilter = tenantId ? `WHERE d.tenant_id = :tenantId` : '';
            const limitClause = limit ? `LIMIT :limit` : '';
            const offsetClause = offset ? `OFFSET :offset` : '';

            return await this.model.sequelize.query(
                `SELECT
                   d.*,
                   COUNT(u.id)                                          AS "employeeCount",
                   COUNT(CASE WHEN u.status = 'active' THEN 1 END)     AS "activeEmployeeCount"
                 FROM departments d
                 LEFT JOIN users u ON u.department_id = d.id
                 ${tenantFilter}
                 GROUP BY d.id
                 ORDER BY d.name ASC
                 ${limitClause} ${offsetClause}`,
                {
                    replacements: {
                        ...(tenantId ? { tenantId } : {}),
                        ...(limit ? { limit } : {}),
                        ...(offset ? { offset } : {})
                    },
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findWithEmployeeCounts');
        }
    }

    async updateManager(departmentId, managerId, options = {}) {
        try {
            return await this.update(departmentId, { managerId }, options);
        } catch (error) {
            throw this._handleError(error, 'updateManager');
        }
    }

    async deactivateWithSubDepartments(departmentId, options = {}) {
        try {
            const { tenantId, transaction } = options;

            const descendants = await this.getAllDescendants(departmentId, { tenantId });
            const departmentIds = [departmentId, ...descendants.map(d => d.id)];

            const where = { id: { [Op.in]: departmentIds } };
            if (tenantId) where.tenantId = tenantId;

            const updateOptions = {};
            if (transaction) updateOptions.transaction = transaction;

            const [affectedRows] = await this.model.update(
                { status: 'inactive' },
                { where, ...updateOptions }
            );

            return {
                modifiedCount: affectedRows,
                deactivatedDepartments: departmentIds
            };
        } catch (error) {
            throw this._handleError(error, 'deactivateWithSubDepartments');
        }
    }
}

export default DepartmentRepository;
