// services/licenseFileLoader.service.js
import fs from 'fs';
import path from 'path';
import { watch } from 'fs';
import {
    parseLicenseFile,
    validateLicenseFileStructure,
    verifyLicenseSignature,
    isLicenseExpired
} from '../config/licenseFileSchema.js';
import logger from '../utils/logger.js';

/**
 * License File Loader Service for On-Premise Deployments
 * 
 * Handles loading, validation, hot-reloading, and caching of license files
 * for On-Premise installations.
 */
class LicenseFileLoader {
    constructor() {
        this.licenseFilePath = process.env.LICENSE_FILE_PATH || path.join(process.cwd(), 'config', 'license.json');
        this.secretKey = process.env.LICENSE_SECRET_KEY || 'default-secret-key-change-in-production';
        this.currentLicense = null;
        this.cachedLicense = null;
        this.cacheTimestamp = null;
        this.fileWatcher = null;
        this.isOnPremiseMode = process.env.DEPLOYMENT_MODE === 'on-premise';
        this.CACHE_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.loadAttempts = 0;
        this.lastLoadError = null;
    }

    /**
     * Initialize the license file loader
     * Loads the license file and sets up hot-reload watching
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize() {
        if (!this.isOnPremiseMode) {
            logger.info('Not in On-Premise mode, skipping license file loader initialization');
            return true;
        }

        logger.info('Initializing On-Premise license file loader', {
            licenseFilePath: this.licenseFilePath
        });

        try {
            // Load initial license file
            const loaded = await this.loadLicenseFile();

            if (!loaded) {
                logger.warn('Failed to load license file on initialization');
                // Try to use cached license if available
                if (this.canUseCachedLicense()) {
                    logger.info('Using cached license during grace period');
                    this.currentLicense = this.cachedLicense;
                } else {
                    logger.error('No valid license available and no cached license within grace period');
                    return false;
                }
            }

            // Set up file watcher for hot-reload
            this.setupFileWatcher();

            logger.info('License file loader initialized successfully');
            return true;

        } catch (error) {
            logger.error('Failed to initialize license file loader', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Load and validate license file
     * @returns {Promise<boolean>} True if license loaded successfully
     */
    async loadLicenseFile() {
        this.loadAttempts++;

        try {
            // Check if file exists
            if (!fs.existsSync(this.licenseFilePath)) {
                this.lastLoadError = 'License file not found';
                logger.error('License file not found', { path: this.licenseFilePath });
                return false;
            }

            // Read file content
            const fileContent = fs.readFileSync(this.licenseFilePath, 'utf8');

            // Parse and validate license file
            const parseResult = parseLicenseFile(fileContent, this.secretKey);

            if (!parseResult.valid) {
                this.lastLoadError = parseResult.errors.join(', ');
                logger.error('License file validation failed', {
                    errors: parseResult.errors,
                    path: this.licenseFilePath
                });
                return false;
            }

            // Additional validation checks
            const licenseData = parseResult.data;

            // Check if license is expired
            if (isLicenseExpired(licenseData)) {
                this.lastLoadError = 'License has expired';
                logger.warn('License file is expired', {
                    expiresAt: licenseData.expiresAt,
                    path: this.licenseFilePath
                });
                // Still load it but mark as expired
            }

            // Verify signature
            if (!verifyLicenseSignature(licenseData, this.secretKey)) {
                this.lastLoadError = 'Invalid license signature';
                logger.error('License signature verification failed', {
                    path: this.licenseFilePath
                });
                return false;
            }

            // License is valid, update current and cached license
            this.currentLicense = licenseData;
            this.cachedLicense = { ...licenseData };
            this.cacheTimestamp = Date.now();
            this.lastLoadError = null;

            logger.info('License file loaded successfully', {
                licenseKey: licenseData.licenseKey,
                companyName: licenseData.companyName,
                expiresAt: licenseData.expiresAt,
                modulesCount: Object.keys(licenseData.modules).length,
                loadAttempts: this.loadAttempts
            });

            return true;

        } catch (error) {
            this.lastLoadError = error.message;
            logger.error('Error loading license file', {
                error: error.message,
                stack: error.stack,
                path: this.licenseFilePath
            });
            return false;
        }
    }

    /**
     * Set up file watcher for hot-reload
     * Watches the license file for changes and reloads automatically
     */
    setupFileWatcher() {
        if (this.fileWatcher) {
            logger.debug('File watcher already set up');
            return;
        }

        try {
            const watchDir = path.dirname(this.licenseFilePath);
            const watchFile = path.basename(this.licenseFilePath);

            // Ensure directory exists
            if (!fs.existsSync(watchDir)) {
                logger.warn('License file directory does not exist, creating it', { dir: watchDir });
                fs.mkdirSync(watchDir, { recursive: true });
            }

            this.fileWatcher = watch(watchDir, { persistent: true }, (eventType, filename) => {
                if (filename === watchFile) {
                    logger.info('License file change detected, reloading', {
                        eventType,
                        filename
                    });

                    // Debounce rapid file changes
                    if (this.reloadTimeout) {
                        clearTimeout(this.reloadTimeout);
                    }

                    this.reloadTimeout = setTimeout(async () => {
                        const reloaded = await this.loadLicenseFile();
                        if (reloaded) {
                            logger.info('License file hot-reloaded successfully');
                        } else {
                            logger.error('Failed to hot-reload license file');
                        }
                    }, 1000); // Wait 1 second to debounce
                }
            });

            logger.info('File watcher set up for license file', {
                watchDir,
                watchFile
            });

        } catch (error) {
            logger.error('Failed to set up file watcher', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Get current license data
     * Falls back to cached license if current is unavailable and within grace period
     * @returns {Object|null} License data or null
     */
    getLicense() {
        if (!this.isOnPremiseMode) {
            return null;
        }

        // Return current license if available
        if (this.currentLicense) {
            return this.currentLicense;
        }

        // Try to use cached license if within grace period
        if (this.canUseCachedLicense()) {
            logger.warn('Using cached license during grace period', {
                cacheAge: Date.now() - this.cacheTimestamp,
                gracePeriod: this.CACHE_GRACE_PERIOD
            });
            return this.cachedLicense;
        }

        logger.error('No valid license available');
        return null;
    }

    /**
     * Check if a module is enabled in the license
     * @param {string} moduleKey - Module key to check
     * @returns {boolean} True if module is enabled
     */
    isModuleEnabled(moduleKey) {
        const license = this.getLicense();

        if (!license) {
            return false;
        }

        // Core HR is always enabled
        if (moduleKey === 'hr-core') {
            return true;
        }

        const module = license.modules[moduleKey];
        return module ? module.enabled : false;
    }

    /**
     * Get module license details
     * @param {string} moduleKey - Module key
     * @returns {Object|null} Module license details or null
     */
    getModuleLicense(moduleKey) {
        const license = this.getLicense();

        if (!license) {
            return null;
        }

        return license.modules[moduleKey] || null;
    }

    /**
     * Get all enabled modules
     * @returns {Array<string>} Array of enabled module keys
     */
    getEnabledModules() {
        const license = this.getLicense();

        if (!license) {
            return ['hr-core']; // Always return Core HR
        }

        const enabledModules = ['hr-core'];

        for (const [moduleKey, moduleConfig] of Object.entries(license.modules)) {
            if (moduleConfig.enabled) {
                enabledModules.push(moduleKey);
            }
        }

        return enabledModules;
    }

    /**
     * Check if license is expired
     * @returns {boolean} True if expired
     */
    isLicenseExpired() {
        const license = this.getLicense();

        if (!license) {
            return true;
        }

        return isLicenseExpired(license);
    }

    /**
     * Get license expiration date
     * @returns {Date|null} Expiration date or null
     */
    getLicenseExpirationDate() {
        const license = this.getLicense();

        if (!license || !license.expiresAt) {
            return null;
        }

        return new Date(license.expiresAt);
    }

    /**
     * Get days until license expiration
     * @returns {number|null} Days until expiration or null
     */
    getDaysUntilExpiration() {
        const expirationDate = this.getLicenseExpirationDate();

        if (!expirationDate) {
            return null;
        }

        const now = new Date();
        const diffTime = expirationDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Check if cached license can be used (within grace period)
     * @returns {boolean} True if cached license is usable
     */
    canUseCachedLicense() {
        if (!this.cachedLicense || !this.cacheTimestamp) {
            return false;
        }

        const cacheAge = Date.now() - this.cacheTimestamp;
        return cacheAge < this.CACHE_GRACE_PERIOD;
    }

    /**
     * Get cache status
     * @returns {Object} Cache status information
     */
    getCacheStatus() {
        return {
            hasCachedLicense: !!this.cachedLicense,
            cacheTimestamp: this.cacheTimestamp,
            cacheAge: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
            gracePeriod: this.CACHE_GRACE_PERIOD,
            canUseCached: this.canUseCachedLicense(),
            remainingGracePeriod: this.cacheTimestamp
                ? Math.max(0, this.CACHE_GRACE_PERIOD - (Date.now() - this.cacheTimestamp))
                : 0
        };
    }

    /**
     * Get loader status
     * @returns {Object} Loader status information
     */
    getStatus() {
        return {
            isOnPremiseMode: this.isOnPremiseMode,
            licenseFilePath: this.licenseFilePath,
            hasCurrentLicense: !!this.currentLicense,
            isLicenseExpired: this.isLicenseExpired(),
            daysUntilExpiration: this.getDaysUntilExpiration(),
            loadAttempts: this.loadAttempts,
            lastLoadError: this.lastLoadError,
            fileWatcherActive: !!this.fileWatcher,
            cacheStatus: this.getCacheStatus(),
            enabledModules: this.getEnabledModules()
        };
    }

    /**
     * Manually reload license file
     * @returns {Promise<boolean>} True if reload successful
     */
    async reload() {
        logger.info('Manual license file reload requested');
        return await this.loadLicenseFile();
    }

    /**
     * Stop file watcher and cleanup
     */
    shutdown() {
        if (this.fileWatcher) {
            this.fileWatcher.close();
            this.fileWatcher = null;
            logger.info('License file watcher stopped');
        }

        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
        }

        logger.info('License file loader shut down');
    }
}

// Export singleton instance
const licenseFileLoader = new LicenseFileLoader();
export default licenseFileLoader;
