/**
 * Tenant Model Registry — COMPATIBILITY SHIM
 *
 * The original mongoose-era pattern handed every tenant its own MongoDB
 * connection and registered fresh schemas on each. Under the Sequelize
 * single-DB-with-`tenant_id` model that no longer applies — but a number of
 * controllers (payroll, salary, vacation, sickLeave, mixedVacation, user,
 * userPhoto, dashboard) still call `registerHRModels(tenantConnection)`.
 *
 * Until those callers are individually refactored to import the Sequelize
 * models directly and pass `tenantId` in their `where` clauses, this module
 * provides a backwards-compatible facade: ignore the `connection` argument,
 * return the singleton Sequelize models. The models themselves enforce tenant
 * isolation via the `tenantId` column on every row.
 *
 * TODO (T012b): refactor each calling controller to use direct imports + a
 * `where: { tenantId, ... }` filter, then delete this shim.
 */

import User from '../modules/hr-core/users/models/user.model.js';
import Department from '../modules/hr-core/users/models/department.model.js';
import Position from '../modules/hr-core/users/models/position.model.js';
import Announcement from '../modules/announcements/models/announcement.model.js';

const HR_MODELS = { User, Department, Position, Announcement };

/**
 * Compatibility: returns the named Sequelize model. The `connection` and
 * `schema` arguments are ignored.
 */
export const registerTenantModel = (_connection, modelName, _schema) => {
    if (!HR_MODELS[modelName]) {
        throw new Error(`registerTenantModel: unknown model '${modelName}'. Add it to HR_MODELS in tenantModelRegistry.js or refactor the caller.`);
    }
    return HR_MODELS[modelName];
};

/**
 * Compatibility: returns the canonical HR Sequelize models. The
 * `connection` argument is ignored.
 */
export const registerHRModels = async (_connection) => ({ ...HR_MODELS });

export default { registerTenantModel, registerHRModels };
