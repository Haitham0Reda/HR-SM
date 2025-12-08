/**
 * UpgradeModal Storybook Stories
 */

import React from 'react';
import UpgradeModal from './UpgradeModal';
import { ThemeConfigProvider } from '../../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';

export default {
    title: 'License/UpgradeModal',
    component: UpgradeModal,
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
        onClose: { action: 'modal closed' },
        onUpgradeClick: { action: 'upgrade clicked' },
    },
};

const Template = (args) => <UpgradeModal {...args} />;

export const Default = Template.bind({});
Default.args = {
    open: true,
    moduleKey: 'documents',
    featureName: 'Document Templates',
    description: 'Create and manage custom document templates for automated generation',
    currentTier: 'starter',
    requiredTier: 'business',
};

export const WithCustomTiers = Template.bind({});
WithCustomTiers.args = {
    open: true,
    moduleKey: 'attendance',
    featureName: 'Biometric Device Integration',
    description: 'Connect and manage biometric attendance devices for automated time tracking',
    currentTier: 'starter',
    requiredTier: 'business',
    pricingTiers: [
        {
            name: 'Business',
            price: 8,
            features: [
                'All Starter features',
                'Biometric device support',
                'Advanced reporting',
                'Priority support',
                'Custom integrations',
            ],
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            features: [
                'All Business features',
                'Unlimited devices',
                'Dedicated support',
                'SLA guarantee',
                'Custom development',
                'Advanced security',
            ],
        },
    ],
};

export const RequiresEnterprise = Template.bind({});
RequiresEnterprise.args = {
    open: true,
    moduleKey: 'payroll',
    featureName: 'Multi-Currency Payroll',
    description: 'Process payroll in multiple currencies for global teams',
    currentTier: 'business',
    requiredTier: 'enterprise',
    pricingTiers: [
        {
            name: 'Enterprise',
            price: 'Custom',
            features: [
                'All Business features',
                'Multi-currency support',
                'Global compliance',
                'Dedicated account manager',
                'SLA guarantee',
                'Priority support',
            ],
        },
    ],
};

export const WithoutDescription = Template.bind({});
WithoutDescription.args = {
    open: true,
    moduleKey: 'reporting',
    featureName: 'Advanced Analytics',
    currentTier: 'starter',
    requiredTier: 'business',
};

export const LongFeatureName = Template.bind({});
LongFeatureName.args = {
    open: true,
    moduleKey: 'tasks',
    featureName: 'Advanced Task Management with Project Tracking and Team Collaboration',
    description: 'Comprehensive task management system with advanced features for project tracking, team collaboration, and productivity monitoring',
    currentTier: 'starter',
    requiredTier: 'business',
};
