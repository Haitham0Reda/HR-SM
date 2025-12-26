import mongoose from 'mongoose';
import Tenant from '../platform/tenants/models/Tenant.js';
import axios from 'axios';

/**
 * Revenue Analytics Service
 * Provides comprehensive revenue analytics including MRR, ARR, churn rate calculations
 * and license usage analytics
 */
class RevenueAnalyticsService {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:4000';
  }

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   * @param {Date} date - Date for calculation (defaults to current month)
   * @returns {Promise<Object>} MRR data
   */
  async calculateMRR(date = new Date()) {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const pipeline = [
      {
        $match: {
          status: 'active',
          'billing.paymentStatus': 'active',
          'billing.billingCycle': 'monthly',
          createdAt: { $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$billing.currentPlan',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$billing.totalRevenue' },
          avgRevenue: { $avg: '$billing.totalRevenue' }
        }
      },
      {
        $group: {
          _id: null,
          totalMRR: { $sum: '$totalRevenue' },
          totalCustomers: { $sum: '$count' },
          planBreakdown: {
            $push: {
              plan: '$_id',
              customers: '$count',
              revenue: '$totalRevenue',
              avgRevenuePerCustomer: '$avgRevenue'
            }
          }
        }
      }
    ];

    const result = await Tenant.aggregate(pipeline);
    const mrrData = result[0] || {
      totalMRR: 0,
      totalCustomers: 0,
      planBreakdown: []
    };

    // Calculate growth rate compared to previous month
    const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const previousMRR = await this.calculateMRR(previousMonth);
    
    const growthRate = previousMRR.totalMRR > 0 
      ? ((mrrData.totalMRR - previousMRR.totalMRR) / previousMRR.totalMRR) * 100 
      : 0;

    return {
      ...mrrData,
      period: {
        start: startOfMonth,
        end: endOfMonth
      },
      growthRate: Math.round(growthRate * 100) / 100,
      previousMRR: previousMRR.totalMRR
    };
  }

  /**
   * Calculate Annual Recurring Revenue (ARR)
   * @param {Date} date - Date for calculation (defaults to current year)
   * @returns {Promise<Object>} ARR data
   */
  async calculateARR(date = new Date()) {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31);

    const pipeline = [
      {
        $match: {
          status: 'active',
          'billing.paymentStatus': 'active',
          createdAt: { $lte: endOfYear }
        }
      },
      {
        $addFields: {
          annualRevenue: {
            $cond: {
              if: { $eq: ['$billing.billingCycle', 'yearly'] },
              then: '$billing.totalRevenue',
              else: { $multiply: ['$billing.totalRevenue', 12] }
            }
          }
        }
      },
      {
        $group: {
          _id: '$billing.currentPlan',
          count: { $sum: 1 },
          totalARR: { $sum: '$annualRevenue' },
          avgARR: { $avg: '$annualRevenue' }
        }
      },
      {
        $group: {
          _id: null,
          totalARR: { $sum: '$totalARR' },
          totalCustomers: { $sum: '$count' },
          planBreakdown: {
            $push: {
              plan: '$_id',
              customers: '$count',
              arr: '$totalARR',
              avgARRPerCustomer: '$avgARR'
            }
          }
        }
      }
    ];

    const result = await Tenant.aggregate(pipeline);
    const arrData = result[0] || {
      totalARR: 0,
      totalCustomers: 0,
      planBreakdown: []
    };

    // Calculate growth rate compared to previous year
    const previousYear = new Date(date.getFullYear() - 1, 0, 1);
    const previousARR = await this.calculateARR(previousYear);
    
    const growthRate = previousARR.totalARR > 0 
      ? ((arrData.totalARR - previousARR.totalARR) / previousARR.totalARR) * 100 
      : 0;

    return {
      ...arrData,
      period: {
        start: startOfYear,
        end: endOfYear
      },
      growthRate: Math.round(growthRate * 100) / 100,
      previousARR: previousARR.totalARR
    };
  }

  /**
   * Calculate churn rate
   * @param {Date} startDate - Start date for calculation
   * @param {Date} endDate - End date for calculation
   * @returns {Promise<Object>} Churn rate data
   */
  async calculateChurnRate(startDate, endDate) {
    if (!startDate || !endDate) {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get customers at start of period
    const customersAtStart = await Tenant.countDocuments({
      status: 'active',
      createdAt: { $lt: startDate }
    });

    // Get customers who churned during period
    const churnedCustomers = await Tenant.countDocuments({
      status: { $in: ['cancelled', 'suspended'] },
      updatedAt: { $gte: startDate, $lte: endDate }
    });

    // Get new customers during period
    const newCustomers = await Tenant.countDocuments({
      status: 'active',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const churnRate = customersAtStart > 0 ? (churnedCustomers / customersAtStart) * 100 : 0;
    const growthRate = customersAtStart > 0 ? (newCustomers / customersAtStart) * 100 : 0;
    const netGrowthRate = growthRate - churnRate;

    // Get churn reasons
    const churnReasons = await Tenant.aggregate([
      {
        $match: {
          status: { $in: ['cancelled', 'suspended'] },
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$metadata.churnReason',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return {
      period: { start: startDate, end: endDate },
      customersAtStart,
      churnedCustomers,
      newCustomers,
      churnRate: Math.round(churnRate * 100) / 100,
      growthRate: Math.round(growthRate * 100) / 100,
      netGrowthRate: Math.round(netGrowthRate * 100) / 100,
      churnReasons: churnReasons.map(r => ({
        reason: r._id || 'Unknown',
        count: r.count
      }))
    };
  }

  /**
   * Get license usage analytics from license server
   * @returns {Promise<Object>} License usage data
   */
  async getLicenseUsageAnalytics() {
    try {
      // Call license server API for analytics
      const apiKey = process.env.LICENSE_SERVER_API_KEY;
      const headers = {
        'Content-Type': 'application/json'
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await axios.get(`${this.licenseServerUrl}/api/licenses/analytics`, {
        headers,
        timeout: 5000
      });

      const licenseData = response.data.data || {};

      // Get additional data from main database
      const tenantLicenseData = await Tenant.aggregate([
        {
          $match: {
            'license.licenseKey': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$license.licenseType',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$billing.totalRevenue' },
            avgRevenue: { $avg: '$billing.totalRevenue' },
            activeCount: {
              $sum: {
                $cond: [{ $eq: ['$license.licenseStatus', 'active'] }, 1, 0]
              }
            },
            expiringCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$license.expiresAt', null] },
                      { $lte: ['$license.expiresAt', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ]);

      // Calculate license utilization
      const utilizationData = await Tenant.aggregate([
        {
          $match: {
            'license.licenseKey': { $exists: true, $ne: null },
            'license.licenseStatus': 'active'
          }
        },
        {
          $project: {
            licenseType: '$license.licenseType',
            userUtilization: {
              $cond: [
                { $gt: ['$license.limits.maxUsers', 0] },
                { $divide: ['$usage.activeUsers', '$license.limits.maxUsers'] },
                0
              ]
            },
            storageUtilization: {
              $cond: [
                { $gt: ['$license.limits.maxStorage', 0] },
                { $divide: ['$usage.storageUsed', { $multiply: ['$license.limits.maxStorage', 1024, 1024] }] },
                0
              ]
            },
            apiUtilization: {
              $cond: [
                { $gt: ['$license.limits.maxAPICallsPerMonth', 0] },
                { $divide: ['$usage.apiCallsThisMonth', '$license.limits.maxAPICallsPerMonth'] },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: '$licenseType',
            avgUserUtilization: { $avg: '$userUtilization' },
            avgStorageUtilization: { $avg: '$storageUtilization' },
            avgApiUtilization: { $avg: '$apiUtilization' },
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        licenseServer: licenseData,
        byType: tenantLicenseData,
        utilization: utilizationData,
        summary: {
          totalLicenses: tenantLicenseData.reduce((sum, item) => sum + item.count, 0),
          activeLicenses: tenantLicenseData.reduce((sum, item) => sum + item.activeCount, 0),
          expiringLicenses: tenantLicenseData.reduce((sum, item) => sum + item.expiringCount, 0),
          totalLicenseRevenue: tenantLicenseData.reduce((sum, item) => sum + item.totalRevenue, 0)
        }
      };
    } catch (error) {
      console.error('Error fetching license analytics:', error.message);
      
      // Fallback to local data only
      const fallbackData = await Tenant.aggregate([
        {
          $match: {
            'license.licenseKey': { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$license.licenseType',
            count: { $sum: 1 },
            activeCount: {
              $sum: {
                $cond: [{ $eq: ['$license.licenseStatus', 'active'] }, 1, 0]
              }
            }
          }
        }
      ]);

      return {
        licenseServer: { error: 'License server unavailable' },
        byType: fallbackData,
        utilization: [],
        summary: {
          totalLicenses: fallbackData.reduce((sum, item) => sum + item.count, 0),
          activeLicenses: fallbackData.reduce((sum, item) => sum + item.activeCount, 0),
          expiringLicenses: 0,
          totalLicenseRevenue: 0
        }
      };
    }
  }

  /**
   * Get usage pattern analysis using MongoDB aggregation pipelines
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Usage pattern data
   */
  async getUsagePatternAnalysis(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      groupBy = 'day' // 'hour', 'day', 'week', 'month'
    } = options;

    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = { 
          year: { $year: '$usage.lastActivityAt' },
          month: { $month: '$usage.lastActivityAt' },
          day: { $dayOfMonth: '$usage.lastActivityAt' },
          hour: { $hour: '$usage.lastActivityAt' }
        };
        break;
      case 'week':
        groupFormat = { 
          year: { $year: '$usage.lastActivityAt' },
          week: { $week: '$usage.lastActivityAt' }
        };
        break;
      case 'month':
        groupFormat = { 
          year: { $year: '$usage.lastActivityAt' },
          month: { $month: '$usage.lastActivityAt' }
        };
        break;
      default: // day
        groupFormat = { 
          year: { $year: '$usage.lastActivityAt' },
          month: { $month: '$usage.lastActivityAt' },
          day: { $dayOfMonth: '$usage.lastActivityAt' }
        };
    }

    const pipeline = [
      {
        $match: {
          'usage.lastActivityAt': { $gte: startDate, $lte: endDate },
          status: 'active'
        }
      },
      {
        $group: {
          _id: groupFormat,
          totalUsers: { $sum: '$usage.activeUsers' },
          totalStorage: { $sum: '$usage.storageUsed' },
          totalAPICalls: { $sum: '$usage.apiCallsThisMonth' },
          avgResponseTime: { $avg: '$metrics.responseTime' },
          avgErrorRate: { $avg: '$metrics.errorRate' },
          tenantCount: { $sum: 1 },
          avgUsersPerTenant: { $avg: '$usage.activeUsers' },
          avgStoragePerTenant: { $avg: '$usage.storageUsed' },
          avgAPICallsPerTenant: { $avg: '$usage.apiCallsThisMonth' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      }
    ];

    const usageData = await Tenant.aggregate(pipeline);

    // Calculate trends
    const trends = this.calculateTrends(usageData);

    return {
      period: { start: startDate, end: endDate },
      groupBy,
      data: usageData,
      trends,
      summary: {
        totalDataPoints: usageData.length,
        avgTenants: usageData.reduce((sum, item) => sum + item.tenantCount, 0) / usageData.length || 0,
        avgUsers: usageData.reduce((sum, item) => sum + item.totalUsers, 0) / usageData.length || 0,
        avgStorage: usageData.reduce((sum, item) => sum + item.totalStorage, 0) / usageData.length || 0,
        avgAPICalls: usageData.reduce((sum, item) => sum + item.totalAPICalls, 0) / usageData.length || 0
      }
    };
  }

  /**
   * Calculate trends from time series data
   * @param {Array} data - Time series data
   * @returns {Object} Trend analysis
   */
  calculateTrends(data) {
    if (data.length < 2) {
      return { users: 0, storage: 0, apiCalls: 0, tenants: 0 };
    }

    const first = data[0];
    const last = data[data.length - 1];

    const calculateGrowthRate = (start, end) => {
      if (start === 0) return end > 0 ? 100 : 0;
      return ((end - start) / start) * 100;
    };

    return {
      users: Math.round(calculateGrowthRate(first.totalUsers, last.totalUsers) * 100) / 100,
      storage: Math.round(calculateGrowthRate(first.totalStorage, last.totalStorage) * 100) / 100,
      apiCalls: Math.round(calculateGrowthRate(first.totalAPICalls, last.totalAPICalls) * 100) / 100,
      tenants: Math.round(calculateGrowthRate(first.tenantCount, last.tenantCount) * 100) / 100,
      responseTime: Math.round(calculateGrowthRate(first.avgResponseTime, last.avgResponseTime) * 100) / 100,
      errorRate: Math.round(calculateGrowthRate(first.avgErrorRate, last.avgErrorRate) * 100) / 100
    };
  }

  /**
   * Get comprehensive revenue dashboard data
   * @param {Object} options - Dashboard options
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getRevenueDashboard(options = {}) {
    const { period = 'month' } = options;
    const now = new Date();

    try {
      const [
        mrrData,
        arrData,
        churnData,
        licenseAnalytics,
        usagePatterns
      ] = await Promise.all([
        this.calculateMRR(now),
        this.calculateARR(now),
        this.calculateChurnRate(),
        this.getLicenseUsageAnalytics(),
        this.getUsagePatternAnalysis({ groupBy: period })
      ]);

      // Calculate key metrics
      const keyMetrics = {
        mrr: mrrData.totalMRR,
        arr: arrData.totalARR,
        churnRate: churnData.churnRate,
        growthRate: mrrData.growthRate,
        totalCustomers: mrrData.totalCustomers,
        activeLicenses: licenseAnalytics.summary.activeLicenses,
        licenseRevenue: licenseAnalytics.summary.totalLicenseRevenue
      };

      return {
        keyMetrics,
        mrr: mrrData,
        arr: arrData,
        churn: churnData,
        licenses: licenseAnalytics,
        usage: usagePatterns,
        generatedAt: new Date(),
        period
      };
    } catch (error) {
      console.error('Error generating revenue dashboard:', error);
      throw new Error(`Failed to generate revenue dashboard: ${error.message}`);
    }
  }

  /**
   * Get revenue by license type
   * @returns {Promise<Array>} Revenue breakdown by license type
   */
  async getRevenueByLicenseType() {
    return await Tenant.aggregate([
      {
        $match: {
          'license.licenseType': { $exists: true, $ne: null },
          'billing.totalRevenue': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$license.licenseType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$billing.totalRevenue' },
          avgRevenue: { $avg: '$billing.totalRevenue' },
          activeLicenses: {
            $sum: {
              $cond: [{ $eq: ['$license.licenseStatus', 'active'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      }
    ]);
  }
}

export default new RevenueAnalyticsService();