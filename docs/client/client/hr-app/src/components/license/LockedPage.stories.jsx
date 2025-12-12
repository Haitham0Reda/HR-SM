/**
 * LockedPage Storybook Stories
 */

import React from 'react';
import LockedPage from './LockedPage';
import { ThemeConfigProvider } from '../../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';

export default {
    title: 'License/LockedPage',
    component: LockedPage,
    decorators: [
        (Story) => (
            <BrowserRouter>
                <ThemeConfigProvider>
                    <Story />
                </ThemeConfigProvider>
            </BrowserRouter>
        ),
    ],
    argTypes: {
        onUpgradeClick: { action: 'upgrade clicked' },
    },
    parameters: {
        layout: 'fullscreen',
    },
};

const Template = (args) => <LockedPage {...args} />;

export const Default = Template.bind({});
Default.args = {
    moduleKey: 'payroll',
    moduleName: 'Payroll Management',
    description: 'Automate payroll processing, tax calculations, and salary disbursements',
    features: [
        'Automated salary calculations',
        'Tax compliance and reporting',
        'Direct deposit integration',
        'Payslip generation',
    ],
    startingPrice: 12,
};

export const WithManyFeatures = Template.bind({});
WithManyFeatures.args = {
    moduleKey: 'attendance',
    moduleName: 'Attendance & Time Tracking',
    description: 'Comprehensive attendance tracking with biometric device support and automated reporting',
    features: [
        'Biometric device integration',
        'Automated time tracking',
        'Shift management',
        'Overtime calculations',
        'Leave integration',
        'Real-time monitoring',
        'Geofencing support',
        'Mobile check-in/out',
    ],
    startingPrice: 8,
};

export const WithoutFeatures = Template.bind({});
WithoutFeatures.args = {
    moduleKey: 'documents',
    moduleName: 'Document Management',
    description: 'Store, organize, and manage all your HR documents in one secure location',
    startingPrice: 5,
};

export const WithoutPrice = Template.bind({});
WithoutPrice.args = {
    moduleKey: 'reporting',
    moduleName: 'Advanced Reporting',
    description: 'Generate detailed reports and analytics for better decision making',
    features: [
        'Custom report builder',
        'Scheduled reports',
        'Export to multiple formats',
        'Data visualization',
    ],
};

export const MinimalInfo = Template.bind({});
MinimalInfo.args = {
    moduleKey: 'tasks',
    moduleName: 'Task Management',
};
