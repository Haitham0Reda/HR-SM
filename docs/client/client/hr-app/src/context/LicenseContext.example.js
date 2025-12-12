/**
 * LicenseContext Usage Examples
 * 
 * This file demonstrates how to use the LicenseContext hooks in your components.
 */

import React from 'react';
import { useLicense } from './LicenseContext';

/**
 * Example 1: Check if a module is enabled
 */
export const ModuleAccessExample = () => {
    const { isModuleEnabled, loading } = useLicense();

    if (loading) {
        return <div>Loading license information...</div>;
    }

    const canAccessAttendance = isModuleEnabled('attendance');

    return (
        <div>
            {canAccessAttendance ? (
                <a href="/app/attendance">Go to Attendance</a>
            ) : (
                <div>Attendance module is not available</div>
            )}
        </div>
    );
};

/**
 * Example 2: Get detailed license information
 */
export const LicenseDetailsExample = () => {
    const { getModuleLicense, loading } = useLicense();

    if (loading) {
        return <div>Loading...</div>;
    }

    const attendanceLicense = getModuleLicense('attendance');

    if (!attendanceLicense) {
        return <div>Attendance module is not licensed</div>;
    }

    return (
        <div>
            <h3>Attendance License</h3>
            <p>Tier: {attendanceLicense.tier}</p>
            <p>Status: {attendanceLicense.status}</p>
            <p>Billing: {attendanceLicense.billingCycle}</p>
            {attendanceLicense.expiresAt && (
                <p>Expires: {new Date(attendanceLicense.expiresAt).toLocaleDateString()}</p>
            )}
        </div>
    );
};

/**
 * Example 3: Check usage limits and show warnings
 */
export const UsageLimitExample = () => {
    const {
        isApproachingLimit,
        getModuleUsage,
        loading
    } = useLicense();

    if (loading) {
        return <div>Loading...</div>;
    }

    const attendanceUsage = getModuleUsage('attendance');
    const isApproachingEmployeeLimit = isApproachingLimit('attendance', 'employees');

    if (!attendanceUsage) {
        return <div>No usage data available</div>;
    }

    return (
        <div>
            <h3>Attendance Usage</h3>

            {/* Employees */}
            <div>
                <p>Employees: {attendanceUsage.employees.current} / {attendanceUsage.employees.limit || 'Unlimited'}</p>
                {attendanceUsage.employees.percentage && (
                    <p>Usage: {attendanceUsage.employees.percentage}%</p>
                )}
                {isApproachingEmployeeLimit && (
                    <div style={{ color: 'orange' }}>
                        ⚠️ Warning: You're approaching your employee limit!
                    </div>
                )}
            </div>

            {/* Storage */}
            <div>
                <p>Storage: {attendanceUsage.storage.current} / {attendanceUsage.storage.limit || 'Unlimited'} bytes</p>
                {attendanceUsage.storage.percentage && (
                    <p>Usage: {attendanceUsage.storage.percentage}%</p>
                )}
            </div>

            {/* API Calls */}
            <div>
                <p>API Calls: {attendanceUsage.apiCalls.current} / {attendanceUsage.apiCalls.limit || 'Unlimited'}</p>
                {attendanceUsage.apiCalls.percentage && (
                    <p>Usage: {attendanceUsage.apiCalls.percentage}%</p>
                )}
            </div>
        </div>
    );
};

/**
 * Example 4: Check license expiration
 */
export const ExpirationWarningExample = () => {
    const {
        isLicenseExpired,
        getDaysUntilExpiration,
        isExpiringSoon,
        loading
    } = useLicense();

    if (loading) {
        return <div>Loading...</div>;
    }

    const moduleKey = 'attendance';
    const expired = isLicenseExpired(moduleKey);
    const expiringSoon = isExpiringSoon(moduleKey, 30); // 30 days threshold
    const daysUntil = getDaysUntilExpiration(moduleKey);

    if (expired) {
        return (
            <div style={{ color: 'red' }}>
                ❌ Your Attendance license has expired!
                <button>Renew Now</button>
            </div>
        );
    }

    if (expiringSoon && daysUntil !== null) {
        return (
            <div style={{ color: 'orange' }}>
                ⚠️ Your Attendance license expires in {daysUntil} days
                <button>Renew Now</button>
            </div>
        );
    }

    return <div>✅ License is active</div>;
};

/**
 * Example 5: Get all enabled modules
 */
export const EnabledModulesExample = () => {
    const { getEnabledModules, loading } = useLicense();

    if (loading) {
        return <div>Loading...</div>;
    }

    const enabledModules = getEnabledModules();

    return (
        <div>
            <h3>Your Active Modules</h3>
            <ul>
                {enabledModules.map(moduleKey => (
                    <li key={moduleKey}>{moduleKey}</li>
                ))}
            </ul>
        </div>
    );
};

/**
 * Example 6: Check for warnings and violations
 */
export const WarningsAndViolationsExample = () => {
    const {
        hasUsageWarnings,
        hasUsageViolations,
        usage,
        loading
    } = useLicense();

    if (loading) {
        return <div>Loading...</div>;
    }

    const warnings = hasUsageWarnings();
    const violations = hasUsageViolations();

    return (
        <div>
            {warnings && (
                <div style={{ backgroundColor: '#fff3cd', padding: '10px' }}>
                    ⚠️ You have usage warnings. Please review your usage limits.
                </div>
            )}

            {violations && (
                <div style={{ backgroundColor: '#f8d7da', padding: '10px' }}>
                    ❌ You have exceeded usage limits. Please upgrade your plan.
                </div>
            )}

            {/* Show detailed warnings */}
            {Object.entries(usage).map(([moduleKey, moduleUsage]) => (
                <div key={moduleKey}>
                    {moduleUsage.warnings && moduleUsage.warnings.length > 0 && (
                        <div>
                            <h4>{moduleKey} Warnings:</h4>
                            <ul>
                                {moduleUsage.warnings.map((warning, idx) => (
                                    <li key={idx}>
                                        {warning.limitType}: {warning.percentage}% used
                                        (triggered at {new Date(warning.triggeredAt).toLocaleString()})
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

/**
 * Example 7: Refresh license data
 */
export const RefreshLicenseExample = () => {
    const { refreshLicenses, loading } = useLicense();

    const handleRefresh = async () => {
        await refreshLicenses();
        alert('License data refreshed!');
    };

    return (
        <div>
            <button onClick={handleRefresh} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh License Data'}
            </button>
        </div>
    );
};

/**
 * Example 8: Conditional rendering based on license
 */
export const ConditionalFeatureExample = () => {
    const { isModuleEnabled, getModuleLicense } = useLicense();

    const attendanceEnabled = isModuleEnabled('attendance');
    const attendanceLicense = getModuleLicense('attendance');

    return (
        <div>
            {attendanceEnabled ? (
                <div>
                    <h2>Attendance Dashboard</h2>
                    <p>You have access to {attendanceLicense?.tier} tier features</p>
                    {/* Render attendance features */}
                </div>
            ) : (
                <div>
                    <h2>Attendance Module Locked</h2>
                    <p>Upgrade your plan to access attendance tracking features</p>
                    <button>View Pricing</button>
                </div>
            )}
        </div>
    );
};

/**
 * Example 9: Error handling
 */
export const ErrorHandlingExample = () => {
    const { error, loading, refreshLicenses } = useLicense();

    if (loading) {
        return <div>Loading license information...</div>;
    }

    if (error) {
        return (
            <div style={{ color: 'red' }}>
                <p>Error loading license: {error}</p>
                <button onClick={refreshLicenses}>Retry</button>
            </div>
        );
    }

    return <div>License loaded successfully</div>;
};

/**
 * Example 10: Using multiple hooks together
 */
export const ComprehensiveExample = () => {
    const {
        isModuleEnabled,
        getModuleLicense,
        getModuleUsage,
        isApproachingLimit,
        isExpiringSoon,
        getDaysUntilExpiration,
        loading,
        error
    } = useLicense();

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    const moduleKey = 'attendance';
    const enabled = isModuleEnabled(moduleKey);
    const license = getModuleLicense(moduleKey);
    const usage = getModuleUsage(moduleKey);
    const expiringSoon = isExpiringSoon(moduleKey);
    const daysUntil = getDaysUntilExpiration(moduleKey);

    if (!enabled) {
        return <div>Module not available</div>;
    }

    return (
        <div>
            <h2>Attendance Module Status</h2>

            {/* License Info */}
            <div>
                <h3>License</h3>
                <p>Tier: {license?.tier}</p>
                <p>Status: {license?.status}</p>
            </div>

            {/* Expiration Warning */}
            {expiringSoon && daysUntil && (
                <div style={{ backgroundColor: '#fff3cd', padding: '10px' }}>
                    ⚠️ License expires in {daysUntil} days
                </div>
            )}

            {/* Usage Info */}
            {usage && (
                <div>
                    <h3>Usage</h3>
                    {['employees', 'storage', 'apiCalls'].map(limitType => {
                        const limitData = usage[limitType];
                        const approaching = isApproachingLimit(moduleKey, limitType);

                        return (
                            <div key={limitType}>
                                <p>
                                    {limitType}: {limitData.current} / {limitData.limit || 'Unlimited'}
                                    {limitData.percentage && ` (${limitData.percentage}%)`}
                                </p>
                                {approaching && (
                                    <span style={{ color: 'orange' }}>⚠️ Approaching limit</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
