import BaseRepository from '../BaseRepository.js';
import Document from '../../modules/documents/models/document.model.js';
import mongoose from 'mongoose';

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