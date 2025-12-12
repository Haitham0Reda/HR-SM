// jobs/licenseMonitoring.job.js
import cron from 'node-cron';
import alertManager from '../platform/system/services/alertManager.service.js';
import metricsService from '../platform/system/services/metrics.service.js';
import License from '../platform/system/models/license.model.js';
import licenseFileLoader from '../platform/system/services/licenseFileLoader.service.js';
import logger from '../utils/logger.js';

/**
 * License Monitoring Job
 * Runs periodic checks for license expiration and updates metrics
 */
class LicenseMonitoringJob {
    constructor() {
        this.isRunning = false;
        this.isOnPremiseMode = process.env.DEPLOYMENT_MODE === 'on-premise';
    }

    /**
     * Start the monitoring job
     * Runs daily at 9:00 AM
     */
    start() {
        // Run license expiration checks daily at 9:00 AM
        cron.schedule('0 9 * * *', async () => {
            logger.info('Running scheduled license expiration check');
            await this.checkLicenseExpiration();
        });

        // Update metrics every hour
        cron.schedule('0 * * * *', async () => {
            logger.info('Updating license metrics');
            await this.updateLicenseMetrics();
        });

        logger.info('License monitoring job started');
    }

    /**
     * Check license expiration and send alerts
     */
    async checkLicenseExpiration() {
        if (this.isRunning) {
            logger.warn('License expiration check already running, skipping');
            return;
        }

        this.isRunning = true;

        try {
            await alertManager.checkLicenseExpirationAlerts();
            logger.info('License expiration check completed');
        } catch (error) {
            logger.error('Error during license expiration check', {
                error: error.message,
                stack: error.stack
            });
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Update license-related metrics
     */
    async updateLicenseMetrics() {
        try {
            if (this.isOnPremiseMode) {
                await this._updateOnPremiseMetrics();
            } else {
                await this._updateSaaSMetrics();
            }
            logger.info('License metrics updated');
        } catch (error) {
            logger.error('Error updating license metrics', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Update metrics for On-Premise deployment
     * @private
     */
    async _updateOnPremiseMetrics() {
        const licenseData = licenseFileLoader.getLicense();

        if (!licenseData) {
            return;
        }

        const now = new Date();
        const expiresAt = new Date(licenseData.expiresAt);
        const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        // Count modules by expiration status
        let expiringIn30Days = 0;
        let expiringIn7Days = 0;
        let expired = 0;

        for (const [moduleKey, moduleLicense] of Object.entries(licenseData.modules)) {
            if (!moduleLicense.enabled) {
                continue;
            }

            if (daysUntilExpiration < 0) {
                expired++;
            } else if (daysUntilExpiration <= 7) {
                expiringIn7Days++;
            } else if (daysUntilExpiration <= 30) {
                expiringIn30Days++;
            }

            // Update active licenses count
            metricsService.updateActiveLicenses(
                moduleKey,
                moduleLicense.tier || 'unknown',
                moduleLicense.enabled ? 1 : 0
            );
        }

        // Update expiration metrics
        metricsService.updateLicenseExpirationMetrics(
            expiringIn30Days,
            expiringIn7Days,
            expired,
            'all'
        );
    }

    /**
     * Update metrics for SaaS deployment
     * @private
     */
    async _updateSaaSMetrics() {
        const licenses = await License.find({
            status: { $in: ['active', 'trial'] }
        });

        const now = new Date();
        const moduleStats = new Map();

        for (const license of licenses) {
            for (const module of license.modules) {
                if (!module.enabled) {
                    continue;
                }

                // Initialize stats for this module if not exists
                if (!moduleStats.has(module.key)) {
                    moduleStats.set(module.key, {
                        expiringIn30Days: 0,
                        expiringIn7Days: 0,
                        expired: 0,
                        activeLicenses: new Map() // tier -> count
                    });
                }

                const stats = moduleStats.get(module.key);

                // Count by tier
                const tier = module.tier || 'unknown';
                stats.activeLicenses.set(tier, (stats.activeLicenses.get(tier) || 0) + 1);

                // Check expiration
                if (module.expiresAt) {
                    const expiresAt = new Date(module.expiresAt);
                    const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiration < 0) {
                        stats.expired++;
                    } else if (daysUntilExpiration <= 7) {
                        stats.expiringIn7Days++;
                    } else if (daysUntilExpiration <= 30) {
                        stats.expiringIn30Days++;
                    }
                }
            }
        }

        // Update metrics for each module
        for (const [moduleKey, stats] of moduleStats.entries()) {
            metricsService.updateLicenseExpirationMetrics(
                stats.expiringIn30Days,
                stats.expiringIn7Days,
                stats.expired,
                moduleKey
            );

            // Update active licenses by tier
            for (const [tier, count] of stats.activeLicenses.entries()) {
                metricsService.updateActiveLicenses(moduleKey, tier, count);
            }
        }
    }

    /**
     * Run checks immediately (useful for testing)
     */
    async runNow() {
        await this.checkLicenseExpiration();
        await this.updateLicenseMetrics();
    }
}

// Export singleton instance
const licenseMonitoringJob = new LicenseMonitoringJob();
export default licenseMonitoringJob;
