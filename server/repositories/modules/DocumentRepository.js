import BaseRepository from '../BaseRepository.js';
import Document from '../../modules/documents/models/document.model.js';
import { Op } from 'sequelize';

/**
 * Repository for Document model operations with category filtering and analytics
 */
class DocumentRepository extends BaseRepository {
    constructor() {
        super(Document);
    }

    /**
     * Find documents by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByEmployee(employeeId, options = {}) {
        try {
            const where = { employee_id: employeeId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.isConfidential !== undefined) {
                where.is_confidential = options.isConfidential;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'updatedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find documents by type/category
     * @param {string} type - Document type
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByType(type, options = {}) {
        try {
            const where = { type };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.employeeId) {
                where.employee_id = options.employeeId;
            }

            if (options.isConfidential !== undefined) {
                where.is_confidential = options.isConfidential;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'updatedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByType');
        }
    }

    /**
     * Find documents by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const where = { department_id: departmentId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.isConfidential !== undefined) {
                where.is_confidential = options.isConfidential;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'updatedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find documents uploaded by user
     * @param {string} userId - User ID who uploaded the documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByUploadedBy(userId, options = {}) {
        try {
            const where = { uploaded_by: userId };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'updatedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByUploadedBy');
        }
    }

    /**
     * Find confidential documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Confidential document records
     */
    async findConfidentialDocuments(options = {}) {
        try {
            const where = { is_confidential: true };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.employeeId) {
                where.employee_id = options.employeeId;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findConfidentialDocuments');
        }
    }

    /**
     * Find documents expiring soon
     * @param {number} [daysAhead=30] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Documents expiring soon
     */
    async findExpiringDocuments(daysAhead = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            const where = {
                expiry_date: { [Op.between]: [now, futureDate] }
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['expiry_date', 'ASC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findExpiringDocuments');
        }
    }

    /**
     * Find expired documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Expired document records
     */
    async findExpiredDocuments(options = {}) {
        try {
            const now = new Date();
            const where = {
                expiry_date: { [Op.lt]: now }
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['expiry_date', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findExpiredDocuments');
        }
    }

    /**
     * Search documents by title or content
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Matching document records
     */
    async searchDocuments(searchTerm, options = {}) {
        try {
            const where = {
                [Op.or]: [
                    { title: { [Op.iLike]: `%${searchTerm}%` } },
                    { arabic_title: { [Op.iLike]: `%${searchTerm}%` } },
                    { file_name: { [Op.iLike]: `%${searchTerm}%` } }
                ]
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.employeeId) {
                where.employee_id = options.employeeId;
            }

            if (options.isConfidential !== undefined) {
                where.is_confidential = options.isConfidential;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'department', attributes: ['id', 'name', 'code'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['created_at', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'searchDocuments');
        }
    }

    /**
     * Get document statistics by type
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document statistics by type
     */
    async getDocumentStatsByType(options = {}) {
        try {
            const where = {};

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            if (options.dateRange) {
                where.created_at = {
                    [Op.between]: [options.dateRange.startDate, options.dateRange.endDate]
                };
            }

            const results = await this.model.findAll({
                where,
                attributes: [
                    'type',
                    'is_confidential',
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('file_size')), 'totalSize'],
                    [this.model.sequelize.fn('AVG', this.model.sequelize.col('file_size')), 'avgSize']
                ],
                group: ['type', 'is_confidential'],
                order: [['type', 'ASC']],
                raw: true
            });

            return results;
        } catch (error) {
            throw this._handleError(error, 'getDocumentStatsByType');
        }
    }

    /**
     * Get document analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Document analytics
     */
    async getDocumentAnalytics(filters = {}, options = {}) {
        try {
            const where = {};

            if (filters.tenantId) {
                where.tenant_id = filters.tenantId;
            }

            if (filters.departmentId) {
                where.department_id = filters.departmentId;
            }

            if (filters.dateRange) {
                where.created_at = {
                    [Op.between]: [filters.dateRange.startDate, filters.dateRange.endDate]
                };
            }

            if (filters.employeeIds && filters.employeeIds.length > 0) {
                where.employee_id = { [Op.in]: filters.employeeIds };
            }

            const monthlyAnalytics = await this.model.findAll({
                where,
                attributes: [
                    'type',
                    [this.model.sequelize.fn('EXTRACT', this.model.sequelize.literal('MONTH FROM created_at')), 'month'],
                    [this.model.sequelize.fn('EXTRACT', this.model.sequelize.literal('YEAR FROM created_at')), 'year'],
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'count'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('file_size')), 'totalSize'],
                    [this.model.sequelize.fn('AVG', this.model.sequelize.col('file_size')), 'avgSize'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal('CASE WHEN is_confidential THEN 1 ELSE 0 END')), 'confidentialCount']
                ],
                group: ['type', this.model.sequelize.literal('EXTRACT(MONTH FROM created_at)'), this.model.sequelize.literal('EXTRACT(YEAR FROM created_at)')],
                order: [[this.model.sequelize.literal('EXTRACT(YEAR FROM created_at)'), 'DESC'], [this.model.sequelize.literal('EXTRACT(MONTH FROM created_at)'), 'DESC'], ['type', 'ASC']],
                raw: true
            });

            // Get expiry analytics
            const now = new Date();
            const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            const expiryWhere = { ...where, expiry_date: { [Op.not]: null } };
            
            const expired = await this.count({ ...expiryWhere, expiry_date: { [Op.lt]: now } });
            const expiringSoon = await this.count({ ...expiryWhere, expiry_date: { [Op.between]: [now, futureDate] } });
            const totalWithExpiry = await this.count(expiryWhere);

            return {
                monthlyAnalytics,
                expiryAnalytics: { expired, expiringSoon, totalWithExpiry }
            };
        } catch (error) {
            throw this._handleError(error, 'getDocumentAnalytics');
        }
    }

    /**
     * Update document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Metadata to update
     * @param {string} updatedBy - User ID who is updating
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated document
     */
    async updateDocumentMetadata(documentId, metadata, updatedBy, options = {}) {
        try {
            const updateData = {
                ...metadata,
                updated_by: updatedBy,
                updated_at: new Date()
            };

            return await this.update(documentId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateDocumentMetadata');
        }
    }

    /**
     * Get documents by file size range
     * @param {number} minSize - Minimum file size in bytes
     * @param {number} maxSize - Maximum file size in bytes
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByFileSizeRange(minSize, maxSize, options = {}) {
        try {
            const where = {
                file_size: { [Op.between]: [minSize, maxSize] }
            };

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.type) {
                where.type = options.type;
            }

            return await this.findAll(where, {
                ...options,
                include: [
                    { association: 'employee', attributes: ['id', 'first_name', 'last_name', 'employee_id'] },
                    { association: 'uploadedByUser', attributes: ['id', 'first_name', 'last_name', 'employee_id'] }
                ],
                order: [['file_size', 'DESC']]
            });
        } catch (error) {
            throw this._handleError(error, 'findByFileSizeRange');
        }
    }

    /**
     * Get storage usage statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Storage usage statistics
     */
    async getStorageUsageStats(options = {}) {
        try {
            const where = {};

            if (options.tenantId) {
                where.tenant_id = options.tenantId;
            }

            if (options.departmentId) {
                where.department_id = options.departmentId;
            }

            const result = await this.model.findOne({
                where,
                attributes: [
                    [this.model.sequelize.fn('COUNT', this.model.sequelize.col('id')), 'totalDocuments'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.col('file_size')), 'totalSize'],
                    [this.model.sequelize.fn('AVG', this.model.sequelize.col('file_size')), 'avgSize'],
                    [this.model.sequelize.fn('MAX', this.model.sequelize.col('file_size')), 'maxSize'],
                    [this.model.sequelize.fn('MIN', this.model.sequelize.col('file_size')), 'minSize'],
                    [this.model.sequelize.fn('SUM', this.model.sequelize.literal('CASE WHEN is_confidential THEN 1 ELSE 0 END')), 'confidentialDocuments']
                ],
                raw: true
            });

            return result || {
                totalDocuments: 0,
                totalSize: 0,
                avgSize: 0,
                maxSize: 0,
                minSize: 0,
                confidentialDocuments: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getStorageUsageStats');
        }
    }
}

export default DocumentRepository;

/**
 * Repository for Document model operations with category filtering and analytics
 */
class DocumentRepository extends BaseRepository {
    constructor() {
        super(Document);
    }

    /**
     * Find documents by employee
     * @param {string} employeeId - Employee ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByEmployee(employeeId, options = {}) {
        try {
            const filter = { employee: employeeId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.isConfidential !== undefined) {
                filter.isConfidential = options.isConfidential;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' },
                    { path: 'updatedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByEmployee');
        }
    }

    /**
     * Find documents by type/category
     * @param {string} type - Document type
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByType(type, options = {}) {
        try {
            const filter = { type };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.employeeId) {
                filter.employee = options.employeeId;
            }

            if (options.isConfidential !== undefined) {
                filter.isConfidential = options.isConfidential;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' },
                    { path: 'updatedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByType');
        }
    }

    /**
     * Find documents by department
     * @param {string} departmentId - Department ID
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByDepartment(departmentId, options = {}) {
        try {
            const filter = { department: departmentId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.isConfidential !== undefined) {
                filter.isConfidential = options.isConfidential;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' },
                    { path: 'updatedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByDepartment');
        }
    }

    /**
     * Find documents uploaded by user
     * @param {string} userId - User ID who uploaded the documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByUploadedBy(userId, options = {}) {
        try {
            const filter = { uploadedBy: userId };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' },
                    { path: 'updatedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByUploadedBy');
        }
    }

    /**
     * Find confidential documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Confidential document records
     */
    async findConfidentialDocuments(options = {}) {
        try {
            const filter = { isConfidential: true };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.employeeId) {
                filter.employee = options.employeeId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findConfidentialDocuments');
        }
    }

    /**
     * Find documents expiring soon
     * @param {number} [daysAhead=30] - Number of days to look ahead
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Documents expiring soon
     */
    async findExpiringDocuments(daysAhead = 30, options = {}) {
        try {
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + daysAhead);

            const filter = {
                expiryDate: { $gte: now, $lte: futureDate }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { expiryDate: 1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findExpiringDocuments');
        }
    }

    /**
     * Find expired documents
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Expired document records
     */
    async findExpiredDocuments(options = {}) {
        try {
            const now = new Date();
            const filter = {
                expiryDate: { $lt: now }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { expiryDate: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findExpiredDocuments');
        }
    }

    /**
     * Search documents by title or content
     * @param {string} searchTerm - Search term
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Matching document records
     */
    async searchDocuments(searchTerm, options = {}) {
        try {
            const filter = {
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { arabicTitle: { $regex: searchTerm, $options: 'i' } },
                    { fileName: { $regex: searchTerm, $options: 'i' } }
                ]
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            if (options.departmentId) {
                filter.department = options.departmentId;
            }

            if (options.employeeId) {
                filter.employee = options.employeeId;
            }

            if (options.isConfidential !== undefined) {
                filter.isConfidential = options.isConfidential;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'department', select: 'name code' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { createdAt: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'searchDocuments');
        }
    }

    /**
     * Get document statistics by type
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document statistics by type
     */
    async getDocumentStatsByType(options = {}) {
        try {
            const matchFilter = {};

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(options.departmentId);
            }

            if (options.dateRange) {
                matchFilter.createdAt = {
                    $gte: options.dateRange.startDate,
                    $lte: options.dateRange.endDate
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            type: '$type',
                            isConfidential: '$isConfidential'
                        },
                        count: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' },
                        avgSize: { $avg: '$fileSize' }
                    }
                },
                {
                    $sort: { '_id.type': 1 }
                }
            ];

            return await this.model.aggregate(pipeline);
        } catch (error) {
            throw this._handleError(error, 'getDocumentStatsByType');
        }
    }

    /**
     * Get document analytics for reporting
     * @param {Object} filters - Filter criteria
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Document analytics
     */
    async getDocumentAnalytics(filters = {}, options = {}) {
        try {
            const matchFilter = {};

            if (filters.tenantId) {
                matchFilter.tenantId = filters.tenantId;
            }

            if (filters.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(filters.departmentId);
            }

            if (filters.dateRange) {
                matchFilter.createdAt = {
                    $gte: filters.dateRange.startDate,
                    $lte: filters.dateRange.endDate
                };
            }

            if (filters.employeeIds && filters.employeeIds.length > 0) {
                matchFilter.employee = {
                    $in: filters.employeeIds.map(id => new mongoose.Types.ObjectId(id))
                };
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: {
                            type: '$type',
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        count: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' },
                        avgSize: { $avg: '$fileSize' },
                        confidentialCount: {
                            $sum: { $cond: ['$isConfidential', 1, 0] }
                        },
                        uploaders: { $addToSet: '$uploadedBy' }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.type': 1 }
                }
            ];

            const monthlyAnalytics = await this.model.aggregate(pipeline);

            // Get expiry analytics
            const now = new Date();
            const expiryAnalytics = await this.model.aggregate([
                { $match: { ...matchFilter, expiryDate: { $exists: true } } },
                {
                    $group: {
                        _id: null,
                        expired: {
                            $sum: { $cond: [{ $lt: ['$expiryDate', now] }, 1, 0] }
                        },
                        expiringSoon: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ['$expiryDate', now] },
                                            { $lte: ['$expiryDate', new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)] }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        totalWithExpiry: { $sum: 1 }
                    }
                }
            ]);

            return {
                monthlyAnalytics,
                expiryAnalytics: expiryAnalytics[0] || { expired: 0, expiringSoon: 0, totalWithExpiry: 0 }
            };
        } catch (error) {
            throw this._handleError(error, 'getDocumentAnalytics');
        }
    }

    /**
     * Update document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Metadata to update
     * @param {string} updatedBy - User ID who is updating
     * @param {Object} [options] - Update options
     * @returns {Promise<Object>} Updated document
     */
    async updateDocumentMetadata(documentId, metadata, updatedBy, options = {}) {
        try {
            const updateData = {
                ...metadata,
                updatedBy,
                updatedAt: new Date()
            };

            return await this.update(documentId, updateData, options);
        } catch (error) {
            throw this._handleError(error, 'updateDocumentMetadata');
        }
    }

    /**
     * Get documents by file size range
     * @param {number} minSize - Minimum file size in bytes
     * @param {number} maxSize - Maximum file size in bytes
     * @param {Object} [options] - Query options
     * @returns {Promise<Array>} Document records
     */
    async findByFileSizeRange(minSize, maxSize, options = {}) {
        try {
            const filter = {
                fileSize: { $gte: minSize, $lte: maxSize }
            };

            if (options.tenantId) {
                filter.tenantId = options.tenantId;
            }

            if (options.type) {
                filter.type = options.type;
            }

            return await this.find(filter, {
                ...options,
                populate: [
                    { path: 'employee', select: 'firstName lastName employeeId' },
                    { path: 'uploadedBy', select: 'firstName lastName employeeId' }
                ],
                sort: { fileSize: -1 }
            });
        } catch (error) {
            throw this._handleError(error, 'findByFileSizeRange');
        }
    }

    /**
     * Get storage usage statistics
     * @param {Object} [options] - Query options
     * @returns {Promise<Object>} Storage usage statistics
     */
    async getStorageUsageStats(options = {}) {
        try {
            const matchFilter = {};

            if (options.tenantId) {
                matchFilter.tenantId = options.tenantId;
            }

            if (options.departmentId) {
                matchFilter.department = new mongoose.Types.ObjectId(options.departmentId);
            }

            const pipeline = [
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        totalDocuments: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' },
                        avgSize: { $avg: '$fileSize' },
                        maxSize: { $max: '$fileSize' },
                        minSize: { $min: '$fileSize' },
                        confidentialDocuments: {
                            $sum: { $cond: ['$isConfidential', 1, 0] }
                        }
                    }
                }
            ];

            const result = await this.model.aggregate(pipeline);
            return result[0] || {
                totalDocuments: 0,
                totalSize: 0,
                avgSize: 0,
                maxSize: 0,
                minSize: 0,
                confidentialDocuments: 0
            };
        } catch (error) {
            throw this._handleError(error, 'getStorageUsageStats');
        }
    }
}

export default DocumentRepository;