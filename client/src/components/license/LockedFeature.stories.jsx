/**
 * LockedFeature Storybook Stories
 */

import React from 'react';
import LockedFeature from './LockedFeature';
import { ThemeConfigProvider } from '../../context/ThemeContext';

export default {
    title: 'License/LockedFeature',
    component: LockedFeature,
    decorators: [
        (Story) => (
            <ThemeConfigProvider>
                <div style={{ padding: '20px' }}>
                    <Story />
                </div>
            </ThemeConfigProvider>
        ),
    ],
    argTypes: {
        onUpgradeClick: { action: 'upgrade clicked' },
    },
};

const Template = (args) => <LockedFeature {...args} />;

export const Default = Template.bind({});
Default.args = {
    moduleKey: 'attendance',
    featureName: 'Biometric Device Integration',
    description: 'Connect and manage biometric attendance devices for automated time tracking',
    startingPrice: 8,
};

export const WithoutPrice = Template.bind({});
WithoutPrice.args = {
    moduleKey: 'documents',
    featureName: 'Document Templates',
    description: 'Create and manage custom document templates for automated generation',
};

export const WithoutDescription = Template.bind({});
WithoutDescription.args = {
    moduleKey: 'payroll',
    featureName: 'Payroll Management',
    startingPrice: 12,
};

export const MinimalInfo = Template.bind({});
MinimalInfo.args = {
    moduleKey: 'reporting',
    featureName: 'Advanced Reporting',
};

export const LongDescription = Template.bind({});
LongDescription.args = {
    moduleKey: 'tasks',
    featureName: 'Task Management System',
    description: 'Comprehensive task management with project tracking, team collaboration, deadline management, progress monitoring, automated notifications, and detailed reporting. Perfect for teams of all sizes looking to improve productivity and accountability.',
    startingPrice: 6,
};
