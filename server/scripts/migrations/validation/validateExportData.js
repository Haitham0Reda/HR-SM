/**
 * Export Data Validation Module
 * 
 * Validates tenant data before export to ensure data integrity.
 * Checks required fields, data types, formats, and referential integrity.
 * 
 * Requirements: 2.2, 7.3
 */

import { MigrationLogger } from '../utils/migrationLogger.js';
import { MigrationValidationError } from '../errors/MigrationErrors.js';

/**
 * Validate exported tenant data before migration
 * 
 * @param {Object} exportData - Export data containing tenants and metadata
 * @returns {Promise<Object>} Validation result with errors and warnings
 */
export async function validateExportedData(exportData) {
  const logger = new MigrationLogger();
  
  try {
    logger.info('Starting export data validation');
    
    const validationResult = {
      valid: true,
      errors: [],
      warnings: [],
      statistics: {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        recordsWithWarnings: 0
      }
    };

    // Validate export data structure
    if (!exportData || typeof exportData !== 'object') {
      validationResult.valid = false;
      validationResult.errors.push({
        type: 'STRUCTURE_ERROR',
        message: 'Export data is not a valid object',
        severity: 'critical'
      });
      return validationResult;
    }

    // Validate metadata presence
    if (!exportData.metadata) {
      validationResult.warnings.push({
        type: 'MISSING_METADATA',
        message: 'Export metadata is missing',
        severity: 'warning'
      });
    }

    // Validate tenants array
    if (!Array.isArray(exportData.tenants)) {
      validationResult.valid = false;
      validationResult.errors.push({
        type: 'STRUCTURE_ERROR',
        message: 'Tenants data is not an array',
        severity: 'critical'
      });
      return validationResult;
    }

    validationResult.statistics.totalRecords = exportData.tenants.length;

    if (exportData.tenants.length === 0) {
      validationResult.warnings.push({
        type: 'EMPTY_EXPORT',
        message: 'No tenant records to validate',
        severity: 'warning'
      });
      logger.warn('No tenant records found in export data');
      return validationResult;
    }

    logger.info(`Validating ${exportData.tenants.length} tenant records`);

    // Validate each tenant record
    const tenantIds = new Set();
    const domains = new Set();

    for (let i = 0; i < exportData.tenants.length; i++) {
      const tenant = exportData.tenants[i];
      const tenantErrors = [];
      const tenantWarnings = [];

      // Validate individual tenant
      const tenantValidation = validateTenantRecord(tenant, i, tenantIds, domains);
      
      tenantErrors.push(...tenantValidation.errors);
      tenantWarnings.push(...tenantValidation.warnings);

      // Track tenant IDs and domains for uniqueness validation
      if (tenant.tenantId) {
        tenantIds.add(tenant.tenantId);
      }
      if (tenant.domain) {
        domains.add(tenant.domain);
      }

      // Aggregate results
      if (tenantErrors.length > 0) {
        validationResult.errors.push(...tenantErrors);
        validationResult.statistics.invalidRecords++;
      } else {
        validationResult.statistics.validRecords++;
      }

      if (tenantWarnings.length > 0) {
        validationResult.warnings.push(...tenantWarnings);
        validationResult.statistics.recordsWithWarnings++;
      }

      // Log progress every 100 records
      if ((i + 1) % 100 === 0) {
        logger.info(`Validated ${i + 1}/${exportData.tenants.length} records`);
      }
    }

    // Determine overall validation status
    if (validationResult.errors.length > 0) {
      validationResult.valid = false;
      logger.error(`Validation failed with ${validationResult.errors.length} errors`);
    } else {
      logger.success('Validation passed successfully');
    }

    // Log summary
    logger.info('Validation summary:', {
      totalRecords: validationResult.statistics.totalRecords,
      validRecords: validationResult.statistics.validRecords,
      invalidRecords: validationResult.statistics.invalidRecords,
      recordsWithWarnings: validationResult.statistics.recordsWithWarnings,
      totalErrors: validationResult.errors.length,
      totalWarnings: validationResult.warnings.length
    });

    return validationResult;

  } catch (error) {
    logger.error('Validation process failed:', error);
    throw new ValidationError('Export data validation failed', error);
  }
}

/**
 * Validate individual tenant record
 * 
 * @param {Object} tenant - Tenant record to validate
 * @param {number} index - Record index for error reporting
 * @param {Set} existingTenantIds - Set of already seen tenant IDs
 * @param {Set} existingDomains - Set of already seen domains
 * @returns {Object} Validation result with errors and warnings
 */
function validateTenantRecord(tenant, index, existingTenantIds, existingDomains) {
  const errors = [];
  const warnings = [];
  const recordContext = `Record ${index + 1}`;

  // Validate required fields
  const requiredFieldsValidation = validateRequiredFields(tenant, recordContext);
  errors.push(...requiredFieldsValidation.errors);
  warnings.push(...requiredFieldsValidation.warnings);

  // Validate data types
  const dataTypesValidation = validateDataTypes(tenant, recordContext);
  errors.push(...dataTypesValidation.errors);
  warnings.push(...dataTypesValidation.warnings);

  // Validate formats
  const formatsValidation = validateFormats(tenant, recordContext);
  errors.push(...formatsValidation.errors);
  warnings.push(...formatsValidation.warnings);

  // Validate uniqueness
  const uniquenessValidation = validateUniqueness(tenant, recordContext, existingTenantIds, existingDomains);
  errors.push(...uniquenessValidation.errors);
  warnings.push(...uniquenessValidation.warnings);

  // Validate referential integrity
  const integrityValidation = validateReferentialIntegrity(tenant, recordContext);
  errors.push(...integrityValidation.errors);
  warnings.push(...integrityValidation.warnings);

  return { errors, warnings };
}

/**
 * Validate required fields are present
 */
function validateRequiredFields(tenant, context) {
  const errors = [];
  const warnings = [];

  const requiredFields = [
    { field: 'tenantId', path: 'tenantId' },
    { field: 'name', path: 'name' },
    { field: 'status', path: 'status' }
  ];

  for (const { field, path } of requiredFields) {
    const value = getNestedValue(tenant, path);
    
    if (value === undefined || value === null || value === '') {
      errors.push({
        type: 'MISSING_REQUIRED_FIELD',
        message: `${context}: Required field '${field}' is missing or empty`,
        field,
        tenantId: tenant.tenantId || 'unknown',
        severity: 'error'
      });
    }
  }

  // Warn about missing optional but important fields
  const importantFields = [
    { field: 'domain', path: 'domain' },
    { field: 'contactInfo.adminEmail', path: 'contactInfo.adminEmail' }
  ];

  for (const { field, path } of importantFields) {
    const value = getNestedValue(tenant, path);
    
    if (!value) {
      warnings.push({
        type: 'MISSING_OPTIONAL_FIELD',
        message: `${context}: Optional field '${field}' is missing`,
        field,
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }
  }

  return { errors, warnings };
}

/**
 * Validate data types
 */
function validateDataTypes(tenant, context) {
  const errors = [];
  const warnings = [];

  const typeChecks = [
    { field: 'tenantId', path: 'tenantId', expectedType: 'string' },
    { field: 'name', path: 'name', expectedType: 'string' },
    { field: 'status', path: 'status', expectedType: 'string' },
    { field: 'enabledModules', path: 'enabledModules', expectedType: 'array' },
    { field: 'subscription', path: 'subscription', expectedType: 'object' },
    { field: 'limits.maxUsers', path: 'limits.maxUsers', expectedType: 'number' },
    { field: 'limits.maxStorage', path: 'limits.maxStorage', expectedType: 'number' },
    { field: 'usage.userCount', path: 'usage.userCount', expectedType: 'number' },
    { field: 'createdAt', path: 'createdAt', expectedType: 'date' },
    { field: 'updatedAt', path: 'updatedAt', expectedType: 'date' }
  ];

  for (const { field, path, expectedType } of typeChecks) {
    const value = getNestedValue(tenant, path);
    
    if (value !== undefined && value !== null) {
      const actualType = getValueType(value);
      
      if (actualType !== expectedType) {
        errors.push({
          type: 'INVALID_DATA_TYPE',
          message: `${context}: Field '${field}' has invalid type. Expected ${expectedType}, got ${actualType}`,
          field,
          expectedType,
          actualType,
          tenantId: tenant.tenantId || 'unknown',
          severity: 'error'
        });
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validate field formats
 */
function validateFormats(tenant, context) {
  const errors = [];
  const warnings = [];

  // Validate tenantId format (lowercase alphanumeric with hyphens/underscores)
  if (tenant.tenantId) {
    const tenantIdRegex = /^[a-z0-9_-]+$/;
    if (!tenantIdRegex.test(tenant.tenantId)) {
      errors.push({
        type: 'INVALID_FORMAT',
        message: `${context}: tenantId '${tenant.tenantId}' contains invalid characters. Must be lowercase alphanumeric with hyphens/underscores only`,
        field: 'tenantId',
        value: tenant.tenantId,
        tenantId: tenant.tenantId,
        severity: 'error'
      });
    }
  }

  // Validate domain format
  if (tenant.domain) {
    const domainRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!domainRegex.test(tenant.domain)) {
      warnings.push({
        type: 'INVALID_FORMAT',
        message: `${context}: domain '${tenant.domain}' may be invalid`,
        field: 'domain',
        value: tenant.domain,
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }
  }

  // Validate email format
  if (tenant.contactInfo?.adminEmail) {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(tenant.contactInfo.adminEmail)) {
      warnings.push({
        type: 'INVALID_FORMAT',
        message: `${context}: adminEmail '${tenant.contactInfo.adminEmail}' is invalid`,
        field: 'contactInfo.adminEmail',
        value: tenant.contactInfo.adminEmail,
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }
  }

  // Validate status enum
  const validStatuses = ['active', 'suspended', 'trial', 'cancelled', 'deleted'];
  if (tenant.status && !validStatuses.includes(tenant.status)) {
    errors.push({
      type: 'INVALID_ENUM_VALUE',
      message: `${context}: status '${tenant.status}' is not a valid value`,
      field: 'status',
      value: tenant.status,
      validValues: validStatuses,
      tenantId: tenant.tenantId || 'unknown',
      severity: 'error'
    });
  }

  // Validate subscription status enum
  const validSubscriptionStatuses = ['active', 'expired', 'cancelled', 'trial'];
  if (tenant.subscription?.status && !validSubscriptionStatuses.includes(tenant.subscription.status)) {
    warnings.push({
      type: 'INVALID_ENUM_VALUE',
      message: `${context}: subscription.status '${tenant.subscription.status}' is not a valid value`,
      field: 'subscription.status',
      value: tenant.subscription.status,
      validValues: validSubscriptionStatuses,
      tenantId: tenant.tenantId || 'unknown',
      severity: 'warning'
    });
  }

  return { errors, warnings };
}

/**
 * Validate uniqueness constraints
 */
function validateUniqueness(tenant, context, existingTenantIds, existingDomains) {
  const errors = [];
  const warnings = [];

  // Check tenantId uniqueness
  if (tenant.tenantId && existingTenantIds.has(tenant.tenantId)) {
    errors.push({
      type: 'DUPLICATE_TENANT_ID',
      message: `${context}: Duplicate tenantId '${tenant.tenantId}' found`,
      field: 'tenantId',
      value: tenant.tenantId,
      tenantId: tenant.tenantId,
      severity: 'error'
    });
  }

  // Check domain uniqueness (if domain exists)
  if (tenant.domain && existingDomains.has(tenant.domain)) {
    errors.push({
      type: 'DUPLICATE_DOMAIN',
      message: `${context}: Duplicate domain '${tenant.domain}' found`,
      field: 'domain',
      value: tenant.domain,
      tenantId: tenant.tenantId || 'unknown',
      severity: 'error'
    });
  }

  return { errors, warnings };
}

/**
 * Validate referential integrity
 */
function validateReferentialIntegrity(tenant, context) {
  const errors = [];
  const warnings = [];

  // Validate enabled modules structure
  if (Array.isArray(tenant.enabledModules)) {
    for (let i = 0; i < tenant.enabledModules.length; i++) {
      const module = tenant.enabledModules[i];
      
      if (!module.moduleId) {
        errors.push({
          type: 'MISSING_MODULE_ID',
          message: `${context}: enabledModules[${i}] is missing moduleId`,
          field: `enabledModules[${i}].moduleId`,
          tenantId: tenant.tenantId || 'unknown',
          severity: 'error'
        });
      }
    }

    // Check for duplicate modules
    const moduleIds = tenant.enabledModules.map(m => m.moduleId).filter(Boolean);
    const uniqueModuleIds = new Set(moduleIds);
    
    if (moduleIds.length !== uniqueModuleIds.size) {
      warnings.push({
        type: 'DUPLICATE_MODULES',
        message: `${context}: Duplicate modules found in enabledModules`,
        field: 'enabledModules',
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }
  }

  // Validate subscription dates
  if (tenant.subscription) {
    const startDate = tenant.subscription.startDate;
    const expiresAt = tenant.subscription.expiresAt;
    
    if (startDate && expiresAt) {
      const start = new Date(startDate);
      const expires = new Date(expiresAt);
      
      if (expires < start) {
        warnings.push({
          type: 'INVALID_DATE_RANGE',
          message: `${context}: subscription.expiresAt is before subscription.startDate`,
          field: 'subscription',
          tenantId: tenant.tenantId || 'unknown',
          severity: 'warning'
        });
      }
    }
  }

  // Validate usage limits
  if (tenant.usage && tenant.limits) {
    if (tenant.usage.userCount > tenant.limits.maxUsers) {
      warnings.push({
        type: 'USAGE_EXCEEDS_LIMIT',
        message: `${context}: userCount (${tenant.usage.userCount}) exceeds maxUsers (${tenant.limits.maxUsers})`,
        field: 'usage.userCount',
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }

    if (tenant.usage.storageUsed > tenant.limits.maxStorage) {
      warnings.push({
        type: 'USAGE_EXCEEDS_LIMIT',
        message: `${context}: storageUsed (${tenant.usage.storageUsed}) exceeds maxStorage (${tenant.limits.maxStorage})`,
        field: 'usage.storageUsed',
        tenantId: tenant.tenantId || 'unknown',
        severity: 'warning'
      });
    }
  }

  return { errors, warnings };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get the type of a value
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  
  // Check if it's a valid ISO date string
  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    // Additional check: must look like an ISO date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'date';
    }
  }
  
  return typeof value;
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends MigrationValidationError {
  constructor(message, originalError) {
    super(message, {
      validationType: 'export_data',
      originalError
    });
    this.name = 'ValidationError';
  }
}
