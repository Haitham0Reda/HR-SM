/**
 * UsageWarningBanner Storybook Stories
 * 
 * Interactive examples of the UsageWarningBanner component in different states.
 */

import React from 'react';
import UsageWarningBanner from './UsageWarningBanner';
import { Box } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';

export default {
    title: 'License/UsageWarningBanner',
    component: UsageWarningBanner,
    decorators: [
        (Story) => (
            <BrowserRouter>
                <Box sx={{ padding: '24px', maxWidth: '800px' }}>
                    <Story />
                </Box>
            </BrowserRouter>
        ),
    ],
    parameters: {
        docs: {
            description: {
                component: 'A banner component that displays usage warnings when a module approaches or exceeds its limits. Supports warning (80-94%) and critical (95%+) severity levels.',
            },
        },
    },
};

// Warning Level (80-94%)
export const WarningLevel = () => (
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
);

WarningLevel.parameters = {
    docs: {
        description: {
            story: 'Warning level banner shown when usage is between 80-94% of the limit.',
        },
    },
};

// Critical Level (95%+)
export const CriticalLevel = () => (
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
);

CriticalLevel.parameters = {
    docs: {
        description: {
            story: 'Critical level banner shown when usage is 95% or more of the limit.',
        },
    },
};

// Storage Limit Warning
export const StorageWarning = () => (
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
);

StorageWarning.parameters = {
    docs: {
        description: {
            story: 'Warning banner for storage limits, showing values in GB.',
        },
    },
};

// API Calls Warning
export const APICallsWarning = () => (
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
);

APICallsWarning.parameters = {
    docs: {
        description: {
            story: 'Warning banner for API call limits, showing formatted numbers.',
        },
    },
};

// Non-Dismissible Banner
export const NonDismissible = () => (
    <UsageWarningBanner
        moduleKey="payroll"
        moduleName="Payroll Management"
        limitType="employees"
        usage={{
            current: 190,
            limit: 200,
            percentage: 95,
        }}
        dismissible={false}
    />
);

NonDismissible.parameters = {
    docs: {
        description: {
            story: 'Critical banner that cannot be dismissed by the user.',
        },
    },
};

// Without Upgrade Button
export const WithoutUpgradeButton = () => (
    <UsageWarningBanner
        moduleKey="leave"
        moduleName="Leave Management"
        limitType="employees"
        usage={{
            current: 165,
            limit: 200,
            percentage: 82,
        }}
        showUpgradeButton={false}
    />
);

WithoutUpgradeButton.parameters = {
    docs: {
        description: {
            story: 'Warning banner without the upgrade button.',
        },
    },
};

// Multiple Warnings Stacked
export const MultipleWarnings = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
);

MultipleWarnings.parameters = {
    docs: {
        description: {
            story: 'Multiple warning banners stacked together, showing different modules and limit types.',
        },
    },
};

// At Exactly 80% (Threshold)
export const AtThreshold = () => (
    <UsageWarningBanner
        moduleKey="tasks"
        moduleName="Task Management"
        limitType="employees"
        usage={{
            current: 40,
            limit: 50,
            percentage: 80,
        }}
    />
);

AtThreshold.parameters = {
    docs: {
        description: {
            story: 'Warning banner shown at exactly 80% usage (the threshold).',
        },
    },
};

// At 100% (Limit Reached)
export const LimitReached = () => (
    <UsageWarningBanner
        moduleKey="payroll"
        moduleName="Payroll Management"
        limitType="employees"
        usage={{
            current: 200,
            limit: 200,
            percentage: 100,
        }}
        dismissible={false}
    />
);

LimitReached.parameters = {
    docs: {
        description: {
            story: 'Critical banner shown when the limit is fully reached (100%).',
        },
    },
};

// With Custom Styling
export const CustomStyling = () => (
    <UsageWarningBanner
        moduleKey="communication"
        moduleName="Communication Hub"
        limitType="employees"
        usage={{
            current: 170,
            limit: 200,
            percentage: 85,
        }}
        sx={{
            border: '2px solid',
            borderColor: 'warning.main',
        }}
    />
);

CustomStyling.parameters = {
    docs: {
        description: {
            story: 'Warning banner with custom styling applied via the sx prop.',
        },
    },
};

// With Dismiss Callback
export const WithDismissCallback = () => {
    const handleDismiss = () => {
        console.log('Banner dismissed');
        alert('Banner dismissed! (Check console)');
    };

    return (
        <UsageWarningBanner
            moduleKey="leave"
            moduleName="Leave Management"
            limitType="employees"
            usage={{
                current: 165,
                limit: 200,
                percentage: 82,
            }}
            onDismiss={handleDismiss}
        />
    );
};

WithDismissCallback.parameters = {
    docs: {
        description: {
            story: 'Warning banner with a callback function that fires when dismissed.',
        },
    },
};
