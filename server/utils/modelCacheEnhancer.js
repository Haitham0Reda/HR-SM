/**
 * Model Cache Enhancer Utility - PostgreSQL/Sequelize stub
 * TODO: Implement Sequelize-specific caching
 */

import logger from './logger.js';

export const enhanceModelsWithCache = (models, options = {}) => {
  logger.warn('enhanceModelsWithCache: Mongoose-specific method called - needs Sequelize implementation');
  return [];
};

export const enhanceSpecificModels = (modelNames, sequelize, options = {}) => {
  logger.warn('enhanceSpecificModels: Mongoose-specific method called - needs Sequelize implementation');
  return [];
};

export const getCachedQueryBuilder = (model, options = {}) => {
  logger.warn('getCachedQueryBuilder: Mongoose-specific method called - needs Sequelize implementation');
  return {
    findById: async () => null,
    findOne: async () => null,
    find: async () => [],
    count: async () => 0,
    aggregate: async () => [],
    create: async () => ({}),
    updateOne: async () => ({}),
    updateMany: async () => ({}),
    deleteOne: async () => ({}),
    deleteMany: async () => ({}),
    model: null
  };
};

export const warmupModelCache = async (tenantId, modelNames, sequelize) => {
  logger.warn('warmupModelCache: Mongoose-specific method called - needs Sequelize implementation');
};

export default {
  enhanceModelsWithCache,
  enhanceSpecificModels,
  getCachedQueryBuilder,
  warmupModelCache
};
