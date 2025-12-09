/**
 * UsageWarningDemo Component
 * 
 * A demo component showcasing all states of the UsageWarningBanner.
 * Useful for development, testing, and documentation purposes.
 */

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import UsageWarningBanner from './UsageWarningBanner';
import { designTokens } from '../../theme/designTokens';

const UsageWarningDemo = () => {
    return (
        <Box sx={{ padding: designTokens.spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
            <Typography variant="h3" sx={{ marginBottom: designTokens.spacing.lg }}>
                Usage Warning Banner Demo
            </Typography>

            <Typography variant="body1" sx={{ marginBottom: designTokens.spacing.xl, color: 'text.secondary' }}>
                This page demonstrates all states and variations of the UsageWarningBanner component.
            </Typography>

            {/* Warning Level (80-94%) */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Warning Level (80-94%)
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Shown when usage is between 80-94% of the limit. Uses warning color (yellow/orange).
                </Typography>
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 42,
                        limit: 50,
                        percentage: 84,
                    }}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* Critical Level (95%+) */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Critical Level (95%+)
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Shown when usage is 95% or more of the limit. Uses error color (red) and includes blocking warning.
                </Typography>
                <UsageWarningBanner
                    moduleKey="payroll"
                    moduleName="Payroll Management"
                    limitType="employees"
                    usage={{
                        current: 190,
                        limit: 200,
                        percentage: 95,
                    }}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* Storage Limit */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Storage Limit Warning
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Storage limits are displayed in GB with 2 decimal places.
                </Typography>
                <UsageWarningBanner
                    moduleKey="documents"
                    moduleName="Document Management"
                    limitType="storage"
                    usage={{
                        current: 8589934592, // 8 GB in bytes
                        limit: 10737418240, // 10 GB in bytes
                        percentage: 80,
                    }}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* API Calls Limit */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    API Calls Limit Warning
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    API call limits are displayed with locale formatting (commas for thousands).
                </Typography>
                <UsageWarningBanner
                    moduleKey="reporting"
                    moduleName="Advanced Reporting"
                    limitType="apiCalls"
                    usage={{
                        current: 8500,
                        limit: 10000,
                        percentage: 85,
                    }}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* Non-Dismissible */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Non-Dismissible Warning
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Critical warnings can be made non-dismissible to ensure users see them.
                </Typography>
                <UsageWarningBanner
                    moduleKey="leave"
                    moduleName="Leave Management"
                    limitType="employees"
                    usage={{
                        current: 195,
                        limit: 200,
                        percentage: 97,
                    }}
                    dismissible={false}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* Without Upgrade Button */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Without Upgrade Button
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    The upgrade button can be hidden if needed.
                </Typography>
                <UsageWarningBanner
                    moduleKey="tasks"
                    moduleName="Task Management"
                    limitType="employees"
                    usage={{
                        current: 165,
                        limit: 200,
                        percentage: 82,
                    }}
                    showUpgradeButton={false}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* At Threshold (80%) */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    At Threshold (Exactly 80%)
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Warning appears at exactly 80% usage.
                </Typography>
                <UsageWarningBanner
                    moduleKey="communication"
                    moduleName="Communication Hub"
                    limitType="employees"
                    usage={{
                        current: 40,
                        limit: 50,
                        percentage: 80,
                    }}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* At Limit (100%) */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    At Limit (100%)
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Critical warning when limit is fully reached.
                </Typography>
                <UsageWarningBanner
                    moduleKey="attendance"
                    moduleName="Attendance & Time Tracking"
                    limitType="employees"
                    usage={{
                        current: 50,
                        limit: 50,
                        percentage: 100,
                    }}
                    dismissible={false}
                />
            </Box>

            <Divider sx={{ marginY: designTokens.spacing.xl }} />

            {/* Multiple Warnings */}
            <Box sx={{ marginBottom: designTokens.spacing.xxl }}>
                <Typography variant="h5" sx={{ marginBottom: designTokens.spacing.md }}>
                    Multiple Warnings Stacked
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: designTokens.spacing.md, color: 'text.secondary' }}>
                    Multiple warnings can be displayed together for different modules or limit types.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing.md }}>
                    <UsageWarningBanner
                        moduleKey="attendance"
                        moduleName="Attendance & Time Tracking"
                        limitType="employees"
                        usage={{
                            current: 48,
                            limit: 50,
                            percentage: 96,
                        }}
                    />
                    <UsageWarningBanner
                        moduleKey="documents"
                        moduleName="Document Management"
                        limitType="storage"
                        usage={{
                            current: 9663676416, // 9 GB
                            limit: 10737418240, // 10 GB
                            percentage: 90,
                        }}
                    />
                    <UsageWarningBanner
                        moduleKey="reporting"
                        moduleName="Advanced Reporting"
                        limitType="apiCalls"
                        usage={{
                            current: 8200,
                            limit: 10000,
                            percentage: 82,
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default UsageWarningDemo;
