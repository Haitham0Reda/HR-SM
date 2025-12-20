import mongoose from 'mongoose';
import { companyLogger } from '../utils/companyLogger.js';
import axios from 'axios';

class LicenseComplianceService {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
    this.complianceThresholds = {
      userUtilizationWarning: 80, // Warn at 80% of user limit
      userUtilizationCritical: 95, // Critical at 95% of user limit
      storageUtilizationWarning: 80, // Warn at 80% of storage limit
      storageUtilizationCritical: 90, // Critical at 90% of storage limit
      apiUtilizationWarning: 85, // Warn at 85% of API limit
      apiUtilizationCritical: 95, // Critical at 95% of API limit
      licenseExpiryWarningDays: 30, // Warn 30 days before expiry
      licenseExpiryCriticalDays: 7 // Critical 7 days before expiry
    };
  }

  /**
   * Generate comprehensive license compliance report
   */
  async generateLicenseComplianceReport(tenantId, startDate, endDate) {
    try {
      companyLogger(tenantId).compliance('Generating license compliance report', {
        tenantId,
        startDate,
        endDate,
        compliance: true,
        audit: true
      });

      // Get license information
      const licenseInfo = await this.getLicenseInfo(tenantId);
      
      // Get usage statistics
      const usageStats = await this.getUsageStatistics(tenantId, startDate, endDate);
      
      // Get license validation history
      const validationHistory = await this.getValidationHistory(tenantId, startDate, endDate);
      
      // Get module usage
      const moduleUsage = await this.getModuleUsage(tenantId, startDate, endDate);
      
      // Analyze compliance
      const complianceAnalysis = this.analyzeCompliance(licenseInfo, usageStats, moduleUsage);
      
      // Generate violations and warnings
      const violations = this.identifyViolations(licenseInfo, usageStats, moduleUsage);
      
      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(complianceAnalysis, violations);

      const report = {
        reportType: 'license_compliance',
        tenantId,
        period: { startDate, endDate },
        generatedAt: new Date(),
        
        summary: {
          licenseStatus: licenseInfo.status,
          licenseType: licenseInfo.type,
          complianceScore,
          complianceLevel: this.getComplianceLevel(complianceScore),
          violationsCount: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'critical').length,
          warningsCount: violations.filter(v => v.severity === 'warning').length,
          daysUntilExpiry: this.calculateDaysUntilExpiry(licenseInfo.expiresAt),
          totalValidations: validationHistory.length,
          failedValidations: validationHistory.filter(v => !v.success).length
        },

        licenseInfo: {
          licenseNumber: licenseInfo.licenseNumber,
          type: licenseInfo.type,
          status: licenseInfo.status,
          issuedAt: licenseInfo.issuedAt,
          expiresAt: licenseInfo.expiresAt,
          features: licenseInfo.features,
          binding: licenseInfo.binding,
          maxActivations: licenseInfo.maxActivations,
          currentActivations: licenseInfo.activations?.length || 0
        },

        usageAnalysis: {
          users: {
            current: usageStats.currentUsers,
            maximum: licenseInfo.features.maxUsers,
            utilization: (usageStats.currentUsers / licenseInfo.features.maxUsers * 100).toFixed(2),
            trend: usageStats.userTrend,
            peakUsage: usageStats.peakUsers
          },
          storage: {
            current: usageStats.currentStorage,
            maximum: licenseInfo.features.maxStorage,
            utilization: (usageStats.currentStorage / licenseInfo.features.maxStorage * 100).toFixed(2),
            trend: usageStats.storageTrend,
            peakUsage: usageStats.peakStorage
          },
          apiCalls: {
            current: usageStats.currentAPICallsThisMonth,
            maximum: licenseInfo.features.maxAPICallsPerMonth,
            utilization: (usageStats.currentAPICallsThisMonth / licenseInfo.features.maxAPICallsPerMonth * 100).toFixed(2),
            trend: usageStats.apiTrend,
            dailyAverage: usageStats.dailyAverageAPICalls
          }
        },

        moduleCompliance: {
          enabledModules: licenseInfo.features.modules,
          usedModules: Object.keys(moduleUsage),
          unauthorizedModules: Object.keys(moduleUsage).filter(
            module => !licenseInfo.features.modules.includes(module)
          ),
          moduleUsageStats: moduleUsage
        },

        validationAnalysis: {
          totalValidations: validationHistory.length,
          successfulValidations: validationHistory.filter(v => v.success).length,
          failedValidations: validationHistory.filter(v => !v.success).length,
          successRate: validationHistory.length > 0 ? 
            (validationHistory.filter(v => v.success).length / validationHistory.length * 100).toFixed(2) : 0,
          validationTrend: this.analyzeValidationTrend(validationHistory),
          failureReasons: this.analyzeFailureReasons(validationHistory.filter(v => !v.success))
        },

        violations,
        complianceAnalysis,
        
        recommendations: this.generateLicenseRecommendations(
          licenseInfo, 
          usageStats, 
          moduleUsage, 
          violations,
          complianceAnalysis
        ),

        historicalData: {
          usageTrends: usageStats.historicalTrends,
          complianceHistory: await this.getComplianceHistory(tenantId, 90) // Last 90 days
        }
      };

      // Log report generation
      companyLogger(tenantId).compliance('License compliance report generated', {
        complianceScore,
        violationsCount: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        compliance: true,
        audit: true
      });

      return report;

    } catch (error) {
      companyLogger(tenantId).error('Failed to generate license compliance report', {
        error: error.message,
        tenantId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  /**
   * Get license information from license server
   */
  async getLicenseInfo(tenantId) {
    try {
      // Get tenant's license information
      const Tenant = mongoose.model('Tenant');
      const tenant = await Tenant.findById(tenantId).select('license');
      
      if (!tenant || !tenant.license || !tenant.license.licenseKey) {
        throw new Error('No license found for tenant');
      }

      // Validate license with license server
      const response = await axios.post(`${this.licenseServerUrl}/licenses/validate`, {
        token: tenant.license.licenseKey,
        machineId: tenant.license.machineId
      });

      if (!response.data.valid) {
        throw new Error('Invalid license');
      }

      // Get detailed license information
      const licenseResponse = await axios.get(
        `${this.licenseServerUrl}/licenses/tenant/${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.LICENSE_SERVER_API_KEY}`
          }
        }
      );

      return licenseResponse.data.license;

    } catch (error) {
      console.error('Failed to get license info:', error.message);
      
      // Return mock data if license server is unavailable
      return {
        licenseNumber: 'HRSM-MOCK-LICENSE',
        type: 'professional',
        status: 'active',
        issuedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        features: {
          modules: ['hr-core', 'tasks', 'reports'],
          maxUsers: 100,
          maxStorage: 10240, // MB
          maxAPICallsPerMonth: 100000
        },
        binding: {
          boundDomain: 'example.com',
          machineHash: 'mock-hash'
        },
        maxActivations: 1,
        activations: [{ activatedAt: new Date() }]
      };
    }
  }

  /**
   * Get usage statistics for the tenant
   */
  async getUsageStatistics(tenantId, startDate, endDate) {
    try {
      const Tenant = mongoose.model('Tenant');
      const tenant = await Tenant.findById(tenantId).select('metrics');

      // Get current usage
      const currentUsers = tenant.metrics?.totalUsers || 0;
      const currentStorage = tenant.metrics?.storageUsed || 0;
      const currentAPICallsThisMonth = tenant.metrics?.apiCallsThisMonth || 0;

      // Calculate trends (this would be more sophisticated in a real implementation)
      const userTrend = this.calculateTrend('users', tenantId, startDate, endDate);
      const storageTrend = this.calculateTrend('storage', tenantId, startDate, endDate);
      const apiTrend = this.calculateTrend('api', tenantId, startDate, endDate);

      // Get peak usage (mock data for now)
      const peakUsers = Math.max(currentUsers, currentUsers * 1.2);
      const peakStorage = Math.max(currentStorage, currentStorage * 1.1);

      return {
        currentUsers,
        currentStorage,
        currentAPICallsThisMonth,
        userTrend,
        storageTrend,
        apiTrend,
        peakUsers,
        peakStorage,
        dailyAverageAPICalls: Math.round(currentAPICallsThisMonth / 30),
        historicalTrends: {
          users: this.generateHistoricalData('users', 30),
          storage: this.generateHistoricalData('storage', 30),
          apiCalls: this.generateHistoricalData('apiCalls', 30)
        }
      };

    } catch (error) {
      console.error('Failed to get usage statistics:', error);
      throw error;
    }
  }

  /**
   * Get license validation history
   */
  async getValidationHistory(tenantId, startDate, endDate) {
    try {
      // This would query actual validation logs
      // For now, return mock data
      const validations = [];
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < days * 24; i++) { // Hourly validations
        const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const success = Math.random() > 0.05; // 95% success rate
        
        validations.push({
          timestamp,
          success,
          responseTime: Math.random() * 100 + 50, // 50-150ms
          errorCode: success ? null : 'LICENSE_EXPIRED',
          machineId: 'mock-machine-id'
        });
      }

      return validations;

    } catch (error) {
      console.error('Failed to get validation history:', error);
      return [];
    }
  }

  /**
   * Get module usage statistics
   */
  async getModuleUsage(tenantId, startDate, endDate) {
    try {
      // This would query actual module usage logs
      // For now, return mock data
      return {
        'hr-core': {
          requests: 15000,
          uniqueUsers: 45,
          lastUsed: new Date(),
          features: ['employees', 'departments', 'positions']
        },
        'tasks': {
          requests: 8500,
          uniqueUsers: 32,
          lastUsed: new Date(),
          features: ['task_creation', 'task_assignment', 'task_tracking']
        },
        'reports': {
          requests: 2300,
          uniqueUsers: 12,
          lastUsed: new Date(),
          features: ['employee_reports', 'attendance_reports']
        },
        'life-insurance': {
          requests: 450,
          uniqueUsers: 8,
          lastUsed: new Date(),
          features: ['policy_management', 'claims_processing']
        }
      };

    } catch (error) {
      console.error('Failed to get module usage:', error);
      return {};
    }
  }

  /**
   * Analyze compliance status
   */
  analyzeCompliance(licenseInfo, usageStats, moduleUsage) {
    const analysis = {
      licenseValidity: {
        isValid: licenseInfo.status === 'active',
        isExpired: new Date() > new Date(licenseInfo.expiresAt),
        daysUntilExpiry: this.calculateDaysUntilExpiry(licenseInfo.expiresAt),
        status: licenseInfo.status
      },
      
      usageCompliance: {
        users: {
          withinLimits: usageStats.currentUsers <= licenseInfo.features.maxUsers,
          utilization: usageStats.currentUsers / licenseInfo.features.maxUsers,
          remaining: licenseInfo.features.maxUsers - usageStats.currentUsers
        },
        storage: {
          withinLimits: usageStats.currentStorage <= licenseInfo.features.maxStorage,
          utilization: usageStats.currentStorage / licenseInfo.features.maxStorage,
          remaining: licenseInfo.features.maxStorage - usageStats.currentStorage
        },
        apiCalls: {
          withinLimits: usageStats.currentAPICallsThisMonth <= licenseInfo.features.maxAPICallsPerMonth,
          utilization: usageStats.currentAPICallsThisMonth / licenseInfo.features.maxAPICallsPerMonth,
          remaining: licenseInfo.features.maxAPICallsPerMonth - usageStats.currentAPICallsThisMonth
        }
      },

      moduleCompliance: {
        authorizedModules: licenseInfo.features.modules,
        usedModules: Object.keys(moduleUsage),
        unauthorizedUsage: Object.keys(moduleUsage).filter(
          module => !licenseInfo.features.modules.includes(module)
        ),
        unusedAuthorizedModules: licenseInfo.features.modules.filter(
          module => !Object.keys(moduleUsage).includes(module)
        )
      },

      activationCompliance: {
        withinLimits: (licenseInfo.activations?.length || 0) <= licenseInfo.maxActivations,
        currentActivations: licenseInfo.activations?.length || 0,
        maxActivations: licenseInfo.maxActivations,
        remaining: licenseInfo.maxActivations - (licenseInfo.activations?.length || 0)
      }
    };

    return analysis;
  }

  /**
   * Identify license violations
   */
  identifyViolations(licenseInfo, usageStats, moduleUsage) {
    const violations = [];

    // Check license expiry
    const daysUntilExpiry = this.calculateDaysUntilExpiry(licenseInfo.expiresAt);
    if (daysUntilExpiry <= 0) {
      violations.push({
        type: 'license_expired',
        severity: 'critical',
        message: 'License has expired',
        details: {
          expiresAt: licenseInfo.expiresAt,
          daysExpired: Math.abs(daysUntilExpiry)
        },
        impact: 'System access may be restricted',
        recommendation: 'Renew license immediately'
      });
    } else if (daysUntilExpiry <= this.complianceThresholds.licenseExpiryCriticalDays) {
      violations.push({
        type: 'license_expiring_critical',
        severity: 'critical',
        message: `License expires in ${daysUntilExpiry} days`,
        details: {
          expiresAt: licenseInfo.expiresAt,
          daysUntilExpiry
        },
        impact: 'System will become inaccessible soon',
        recommendation: 'Renew license immediately'
      });
    } else if (daysUntilExpiry <= this.complianceThresholds.licenseExpiryWarningDays) {
      violations.push({
        type: 'license_expiring_warning',
        severity: 'warning',
        message: `License expires in ${daysUntilExpiry} days`,
        details: {
          expiresAt: licenseInfo.expiresAt,
          daysUntilExpiry
        },
        impact: 'Plan for license renewal',
        recommendation: 'Schedule license renewal'
      });
    }

    // Check user limits
    const userUtilization = (usageStats.currentUsers / licenseInfo.features.maxUsers) * 100;
    if (usageStats.currentUsers > licenseInfo.features.maxUsers) {
      violations.push({
        type: 'user_limit_exceeded',
        severity: 'critical',
        message: `User count (${usageStats.currentUsers}) exceeds license limit (${licenseInfo.features.maxUsers})`,
        details: {
          currentUsers: usageStats.currentUsers,
          maxUsers: licenseInfo.features.maxUsers,
          excess: usageStats.currentUsers - licenseInfo.features.maxUsers,
          utilization: userUtilization
        },
        impact: 'License violation - immediate action required',
        recommendation: 'Upgrade license or reduce user count'
      });
    } else if (userUtilization >= this.complianceThresholds.userUtilizationCritical) {
      violations.push({
        type: 'user_limit_critical',
        severity: 'critical',
        message: `User utilization at ${userUtilization.toFixed(1)}% of license limit`,
        details: {
          currentUsers: usageStats.currentUsers,
          maxUsers: licenseInfo.features.maxUsers,
          utilization: userUtilization
        },
        impact: 'Risk of exceeding user limit',
        recommendation: 'Plan license upgrade or user management'
      });
    } else if (userUtilization >= this.complianceThresholds.userUtilizationWarning) {
      violations.push({
        type: 'user_limit_warning',
        severity: 'warning',
        message: `User utilization at ${userUtilization.toFixed(1)}% of license limit`,
        details: {
          currentUsers: usageStats.currentUsers,
          maxUsers: licenseInfo.features.maxUsers,
          utilization: userUtilization
        },
        impact: 'Monitor user growth',
        recommendation: 'Consider license upgrade planning'
      });
    }

    // Check storage limits
    const storageUtilization = (usageStats.currentStorage / licenseInfo.features.maxStorage) * 100;
    if (usageStats.currentStorage > licenseInfo.features.maxStorage) {
      violations.push({
        type: 'storage_limit_exceeded',
        severity: 'critical',
        message: `Storage usage (${usageStats.currentStorage}MB) exceeds license limit (${licenseInfo.features.maxStorage}MB)`,
        details: {
          currentStorage: usageStats.currentStorage,
          maxStorage: licenseInfo.features.maxStorage,
          excess: usageStats.currentStorage - licenseInfo.features.maxStorage,
          utilization: storageUtilization
        },
        impact: 'License violation - data operations may be restricted',
        recommendation: 'Upgrade license or implement data cleanup'
      });
    } else if (storageUtilization >= this.complianceThresholds.storageUtilizationCritical) {
      violations.push({
        type: 'storage_limit_critical',
        severity: 'critical',
        message: `Storage utilization at ${storageUtilization.toFixed(1)}% of license limit`,
        details: {
          currentStorage: usageStats.currentStorage,
          maxStorage: licenseInfo.features.maxStorage,
          utilization: storageUtilization
        },
        impact: 'Risk of exceeding storage limit',
        recommendation: 'Plan storage cleanup or license upgrade'
      });
    } else if (storageUtilization >= this.complianceThresholds.storageUtilizationWarning) {
      violations.push({
        type: 'storage_limit_warning',
        severity: 'warning',
        message: `Storage utilization at ${storageUtilization.toFixed(1)}% of license limit`,
        details: {
          currentStorage: usageStats.currentStorage,
          maxStorage: licenseInfo.features.maxStorage,
          utilization: storageUtilization
        },
        impact: 'Monitor storage growth',
        recommendation: 'Consider storage management or license upgrade'
      });
    }

    // Check API limits
    const apiUtilization = (usageStats.currentAPICallsThisMonth / licenseInfo.features.maxAPICallsPerMonth) * 100;
    if (usageStats.currentAPICallsThisMonth > licenseInfo.features.maxAPICallsPerMonth) {
      violations.push({
        type: 'api_limit_exceeded',
        severity: 'critical',
        message: `API calls (${usageStats.currentAPICallsThisMonth}) exceed monthly limit (${licenseInfo.features.maxAPICallsPerMonth})`,
        details: {
          currentAPICalls: usageStats.currentAPICallsThisMonth,
          maxAPICalls: licenseInfo.features.maxAPICallsPerMonth,
          excess: usageStats.currentAPICallsThisMonth - licenseInfo.features.maxAPICallsPerMonth,
          utilization: apiUtilization
        },
        impact: 'API throttling may be applied',
        recommendation: 'Upgrade license or optimize API usage'
      });
    } else if (apiUtilization >= this.complianceThresholds.apiUtilizationCritical) {
      violations.push({
        type: 'api_limit_critical',
        severity: 'critical',
        message: `API utilization at ${apiUtilization.toFixed(1)}% of monthly limit`,
        details: {
          currentAPICalls: usageStats.currentAPICallsThisMonth,
          maxAPICalls: licenseInfo.features.maxAPICallsPerMonth,
          utilization: apiUtilization
        },
        impact: 'Risk of exceeding API limit',
        recommendation: 'Monitor API usage or plan license upgrade'
      });
    } else if (apiUtilization >= this.complianceThresholds.apiUtilizationWarning) {
      violations.push({
        type: 'api_limit_warning',
        severity: 'warning',
        message: `API utilization at ${apiUtilization.toFixed(1)}% of monthly limit`,
        details: {
          currentAPICalls: usageStats.currentAPICallsThisMonth,
          maxAPICalls: licenseInfo.features.maxAPICallsPerMonth,
          utilization: apiUtilization
        },
        impact: 'Monitor API usage patterns',
        recommendation: 'Consider API optimization or license upgrade planning'
      });
    }

    // Check unauthorized module usage
    const unauthorizedModules = Object.keys(moduleUsage).filter(
      module => !licenseInfo.features.modules.includes(module)
    );

    unauthorizedModules.forEach(module => {
      violations.push({
        type: 'unauthorized_module_usage',
        severity: 'critical',
        message: `Unauthorized module usage: ${module}`,
        details: {
          module,
          usage: moduleUsage[module],
          authorizedModules: licenseInfo.features.modules
        },
        impact: 'License violation - module access should be restricted',
        recommendation: 'Upgrade license to include module or disable module access'
      });
    });

    // Check activation limits
    const currentActivations = licenseInfo.activations?.length || 0;
    if (currentActivations > licenseInfo.maxActivations) {
      violations.push({
        type: 'activation_limit_exceeded',
        severity: 'critical',
        message: `License activations (${currentActivations}) exceed limit (${licenseInfo.maxActivations})`,
        details: {
          currentActivations,
          maxActivations: licenseInfo.maxActivations,
          excess: currentActivations - licenseInfo.maxActivations
        },
        impact: 'License violation - some activations should be revoked',
        recommendation: 'Revoke excess activations or upgrade license'
      });
    }

    return violations;
  }

  /**
   * Calculate compliance score
   */
  calculateComplianceScore(complianceAnalysis, violations) {
    let score = 100;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'warning':
          score -= 5;
          break;
        default:
          score -= 2;
      }
    });

    // Deduct points for high utilization even if not violating
    const userUtil = complianceAnalysis.usageCompliance.users.utilization;
    const storageUtil = complianceAnalysis.usageCompliance.storage.utilization;
    const apiUtil = complianceAnalysis.usageCompliance.apiCalls.utilization;

    if (userUtil > 0.9) score -= 5;
    if (storageUtil > 0.9) score -= 5;
    if (apiUtil > 0.9) score -= 5;

    // Bonus points for good practices
    if (complianceAnalysis.licenseValidity.daysUntilExpiry > 90) score += 5;
    if (violations.length === 0) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate license recommendations
   */
  generateLicenseRecommendations(licenseInfo, usageStats, moduleUsage, violations, complianceAnalysis) {
    const recommendations = [];

    // License expiry recommendations
    const daysUntilExpiry = this.calculateDaysUntilExpiry(licenseInfo.expiresAt);
    if (daysUntilExpiry <= 30) {
      recommendations.push({
        title: 'License Renewal Required',
        description: `License expires in ${daysUntilExpiry} days. Initiate renewal process immediately.`,
        priority: daysUntilExpiry <= 7 ? 'critical' : 'high',
        category: 'license_management',
        impact: 'System access will be lost if license expires',
        actionItems: [
          'Contact license provider for renewal',
          'Prepare renewal documentation',
          'Schedule renewal before expiry date'
        ]
      });
    }

    // Usage optimization recommendations
    const userUtil = complianceAnalysis.usageCompliance.users.utilization;
    const storageUtil = complianceAnalysis.usageCompliance.storage.utilization;
    const apiUtil = complianceAnalysis.usageCompliance.apiCalls.utilization;

    if (userUtil > 0.8) {
      recommendations.push({
        title: 'User Limit Management',
        description: `User utilization is at ${(userUtil * 100).toFixed(1)}%. Consider license upgrade or user management.`,
        priority: userUtil > 0.95 ? 'critical' : 'medium',
        category: 'capacity_planning',
        impact: 'Risk of exceeding user limits',
        actionItems: [
          'Review inactive user accounts',
          'Consider license upgrade',
          'Implement user lifecycle management'
        ]
      });
    }

    if (storageUtil > 0.8) {
      recommendations.push({
        title: 'Storage Management',
        description: `Storage utilization is at ${(storageUtil * 100).toFixed(1)}%. Implement storage optimization.`,
        priority: storageUtil > 0.9 ? 'critical' : 'medium',
        category: 'storage_optimization',
        impact: 'Risk of exceeding storage limits',
        actionItems: [
          'Implement data archival policies',
          'Clean up unnecessary files',
          'Consider license upgrade for more storage'
        ]
      });
    }

    if (apiUtil > 0.8) {
      recommendations.push({
        title: 'API Usage Optimization',
        description: `API utilization is at ${(apiUtil * 100).toFixed(1)}%. Optimize API usage patterns.`,
        priority: apiUtil > 0.95 ? 'critical' : 'medium',
        category: 'api_optimization',
        impact: 'Risk of API throttling',
        actionItems: [
          'Implement API caching',
          'Optimize API call patterns',
          'Consider license upgrade for higher API limits'
        ]
      });
    }

    // Module recommendations
    const unauthorizedModules = complianceAnalysis.moduleCompliance.unauthorizedUsage;
    if (unauthorizedModules.length > 0) {
      recommendations.push({
        title: 'Unauthorized Module Usage',
        description: `${unauthorizedModules.length} modules are being used without proper licensing.`,
        priority: 'critical',
        category: 'license_compliance',
        impact: 'License violation',
        actionItems: [
          'Upgrade license to include required modules',
          'Disable unauthorized module access',
          'Review module usage policies'
        ]
      });
    }

    const unusedModules = complianceAnalysis.moduleCompliance.unusedAuthorizedModules;
    if (unusedModules.length > 0) {
      recommendations.push({
        title: 'Unused Licensed Modules',
        description: `${unusedModules.length} licensed modules are not being used.`,
        priority: 'low',
        category: 'cost_optimization',
        impact: 'Potential cost savings',
        actionItems: [
          'Review module necessity',
          'Consider downgrading license',
          'Train users on available modules'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  calculateDaysUntilExpiry(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  }

  getComplianceLevel(score) {
    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 70) return 'acceptable';
    if (score >= 50) return 'needs_improvement';
    return 'poor';
  }

  calculateTrend(metric, tenantId, startDate, endDate) {
    // This would calculate actual trends from historical data
    // For now, return mock trend
    return Math.random() > 0.5 ? 'increasing' : 'stable';
  }

  generateHistoricalData(metric, days) {
    // Generate mock historical data
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date,
        value: Math.floor(Math.random() * 100) + 50
      });
    }
    return data;
  }

  analyzeValidationTrend(validationHistory) {
    // Analyze validation success rate trend
    const recent = validationHistory.slice(-24); // Last 24 hours
    const older = validationHistory.slice(-48, -24); // Previous 24 hours
    
    const recentSuccessRate = recent.filter(v => v.success).length / recent.length;
    const olderSuccessRate = older.filter(v => v.success).length / older.length;
    
    if (recentSuccessRate > olderSuccessRate) return 'improving';
    if (recentSuccessRate < olderSuccessRate) return 'declining';
    return 'stable';
  }

  analyzeFailureReasons(failedValidations) {
    const reasons = {};
    failedValidations.forEach(validation => {
      const reason = validation.errorCode || 'unknown';
      reasons[reason] = (reasons[reason] || 0) + 1;
    });
    return reasons;
  }

  async getComplianceHistory(tenantId, days) {
    // This would get historical compliance data
    // For now, return mock data
    const history = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      history.push({
        date,
        complianceScore: Math.floor(Math.random() * 20) + 80, // 80-100
        violations: Math.floor(Math.random() * 3), // 0-2 violations
        userUtilization: Math.random() * 100,
        storageUtilization: Math.random() * 100,
        apiUtilization: Math.random() * 100
      });
    }
    return history;
  }
}

export default new LicenseComplianceService();