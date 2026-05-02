import { Op, QueryTypes } from 'sequelize';
import BaseRepository from '../BaseRepository.js';
import Position from '../../modules/hr-core/users/models/position.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';

class PositionRepository extends BaseRepository {
    constructor() {
        super(Position);
    }

    async findByDepartment(departmentId, options = {}) {
        try {
            return await this.findAll({ departmentId }, options);
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    async findActivePositions(options = {}) {
        try {
            return await this.findAll({ status: 'active' }, options);
        } catch (error) {
            throw this._handleError(error, 'findActivePositions');
        }
    }

    async findByCode(code, options = {}) {
        try {
            return await this.findOne({ code }, options);
        } catch (error) {
            throw this._handleError(error, 'findByCode');
        }
    }

    async searchByTitle(searchTerm, options = {}) {
        try {
            const term = `%${searchTerm}%`;
            const filter = {
                [Op.or]: [
                    { title: { [Op.iLike]: term } },
                    { code: { [Op.iLike]: term } }
                ]
            };
            return await this.findAll(filter, options);
        } catch (error) {
            throw this._handleError(error, 'searchByTitle');
        }
    }

    async findWithDepartment(filter = {}, options = {}) {
        try {
            return await this.findAll(filter, {
                ...options,
                include: [{
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code']
                }]
            });
        } catch (error) {
            throw this._handleError(error, 'findWithDepartment');
        }
    }

    async findWithEmployeeCounts(options = {}) {
        try {
            const { tenantId, limit, offset } = options;
            const tenantFilter = tenantId ? `WHERE p.tenant_id = :tenantId` : '';
            const limitClause = limit ? `LIMIT :limit` : '';
            const offsetClause = offset ? `OFFSET :offset` : '';

            return await this.model.sequelize.query(
                `SELECT
                   p.*,
                   d.name                                              AS "departmentName",
                   d.code                                              AS "departmentCode",
                   COUNT(u.id)                                         AS "employeeCount",
                   COUNT(CASE WHEN u.status = 'active' THEN 1 END)    AS "activeEmployeeCount"
                 FROM positions p
                 LEFT JOIN departments d ON d.id = p.department_id
                 LEFT JOIN users u ON u.position_id = p.id
                 ${tenantFilter}
                 GROUP BY p.id, d.name, d.code
                 ORDER BY p.title ASC
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

    async getPositionStatsByDepartment(options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `WHERE p.tenant_id = :tenantId` : '';

            return await this.model.sequelize.query(
                `SELECT
                   p.department_id                                              AS "departmentId",
                   d.name                                                       AS "departmentName",
                   d.code                                                       AS "departmentCode",
                   COUNT(*)                                                     AS "totalPositions",
                   SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END)       AS "activePositions"
                 FROM positions p
                 LEFT JOIN departments d ON d.id = p.department_id
                 ${tenantFilter}
                 GROUP BY p.department_id, d.name, d.code
                 ORDER BY d.name ASC`,
                {
                    replacements: tenantId ? { tenantId } : {},
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            throw this._handleError(error, 'getPositionStatsByDepartment');
        }
    }

    async getPositionStats(options = {}) {
        try {
            const { tenantId } = options;
            const tenantFilter = tenantId ? `WHERE tenant_id = :tenantId` : '';

            const [stats] = await this.model.sequelize.query(
                `SELECT
                   COUNT(*)                                                     AS "totalPositions",
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)         AS "activePositions",
                   SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END)        AS "inactivePositions"
                 FROM positions
                 ${tenantFilter}`,
                {
                    replacements: tenantId ? { tenantId } : {},
                    type: QueryTypes.SELECT
                }
            );

            return stats || { totalPositions: 0, activePositions: 0, inactivePositions: 0 };
        } catch (error) {
            throw this._handleError(error, 'getPositionStats');
        }
    }

    async findAvailablePositions(options = {}) {
        try {
            const { tenantId, maxEmployees = 5, limit, offset } = options;
            const tenantFilter = tenantId ? `AND p.tenant_id = :tenantId` : '';
            const limitClause = limit ? `LIMIT :limit` : '';
            const offsetClause = offset ? `OFFSET :offset` : '';

            return await this.model.sequelize.query(
                `SELECT
                   p.*,
                   d.name AS "departmentName",
                   d.code AS "departmentCode",
                   COUNT(u.id) AS "employeeCount"
                 FROM positions p
                 LEFT JOIN departments d ON d.id = p.department_id
                 LEFT JOIN users u ON u.position_id = p.id AND u.status = 'active'
                 WHERE p.status = 'active' ${tenantFilter}
                 GROUP BY p.id, d.name, d.code
                 HAVING COUNT(u.id) <= :maxEmployees
                 ORDER BY p.title ASC
                 ${limitClause} ${offsetClause}`,
                {
                    replacements: {
                        maxEmployees,
                        ...(tenantId ? { tenantId } : {}),
                        ...(limit ? { limit } : {}),
                        ...(offset ? { offset } : {})
                    },
                    type: QueryTypes.SELECT
                }
            );
        } catch (error) {
            throw this._handleError(error, 'findAvailablePositions');
        }
    }

    async bulkUpdateByDepartment(departmentId, updateData, options = {}) {
        try {
            const { tenantId, transaction } = options;

            const where = { departmentId };
            if (tenantId) where.tenantId = tenantId;

            const updateOptions = {};
            if (transaction) updateOptions.transaction = transaction;

            const [affectedRows] = await this.model.update(updateData, { where, ...updateOptions });

            return {
                modifiedCount: affectedRows,
                acknowledged: true
            };
        } catch (error) {
            throw this._handleError(error, 'bulkUpdateByDepartment');
        }
    }

    async deactivateByDepartment(departmentId, options = {}) {
        try {
            return await this.bulkUpdateByDepartment(departmentId, { status: 'inactive' }, options);
        } catch (error) {
            throw this._handleError(error, 'deactivateByDepartment');
        }
    }

    async getNextPositionCode(options = {}) {
        try {
            const { tenantId } = options;
            const filter = tenantId ? { tenantId } : {};

            const positions = await this.findAll(filter, {
                attributes: ['code'],
                order: [['code', 'DESC']],
                limit: 100
            });

            let nextNumber = 1;
            const existingNumbers = new Set();

            for (const pos of positions) {
                if (pos.code) {
                    const match = pos.code.match(/\d+$/);
                    if (match) {
                        const num = parseInt(match[0]);
                        if (!isNaN(num)) existingNumbers.add(num);
                    }
                }
            }

            while (existingNumbers.has(nextNumber)) {
                nextNumber++;
            }

            return 'POS' + nextNumber.toString().padStart(3, '0');
        } catch (error) {
            throw this._handleError(error, 'getNextPositionCode');
        }
    }

    async isCodeUnique(code, excludeId = null, options = {}) {
        try {
            const filter = { code };
            if (excludeId) filter.id = { [Op.ne]: excludeId };

            const existing = await this.findOne(filter, options);
            return !existing;
        } catch (error) {
            throw this._handleError(error, 'isCodeUnique');
        }
    }
}

export default PositionRepository;
