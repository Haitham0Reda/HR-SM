/**
 * License Components Demo
 * 
 * This file demonstrates the usage of all license-related components.
 * It can be used for testing and as a reference for implementation.
 */

import React, { useState } from 'react';
import { Box, Container, Stack, Typography, Button, Divider } from '@mui/material';
import LockedFeature from './LockedFeature';
import LockedPage from './LockedPage';
import UpgradeModal from './UpgradeModal';
import { designTokens } from '../../theme/designTokens';

const LicenseComponentsDemo = () => {
    const [showLockedPage, setShowLockedPage] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    if (showLockedPage) {
        return (
            <LockedPage
                moduleKey="payroll"
                moduleName="Payroll Management"
                description="Automate payroll processing, tax calculations, and salary disbursements with our comprehensive payroll management system."
                features={[
                    'Automated salary calculations with tax deductions',
                    'Multi-currency support for global teams',
                    'Direct deposit and payment integration',
                    'Payslip generation and distribution',
                    'Tax compliance and reporting',
                    'Overtime and bonus calculations',
                ]}
                startingPrice={12}
                onUpgradeClick={() => {
                    console.log('Upgrade clicked from LockedPage');
                    setShowLockedPage(false);
                }}
            />
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={4}>
                {/* Header */}
                <Box>
                    <Typography variant="h3" gutterBottom>
                        License Components Demo
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        This page demonstrates all license-related UI components.
                    </Typography>
                </Box>

                <Divider />

                {/* LockedFeature Demo */}
                <Box>
                    <Typography variant="h5" gutterBottom>
                        1. LockedFeature Component
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        An overlay component for inline locked features within a page.
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <LockedFeature
                            moduleKey="attendance"
                            featureName="Biometric Device Integration"
                            description="Connect and manage biometric attendance devices for automated time tracking. Support for multiple device types including fingerprint, facial recognition, and RFID."
                            startingPrice={8}
                            onUpgradeClick={() => console.log('Upgrade clicked from LockedFeature')}
                        />
                    </Box>
                </Box>

                <Divider />

                {/* LockedPage Demo */}
                <Box>
                    <Typography variant="h5" gutterBottom>
                        2. LockedPage Component
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        A full-page component for locked modules. Click the button below to see it.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setShowLockedPage(true)}
                        sx={{ mt: 2 }}
                    >
                        Show LockedPage Demo
                    </Button>
                </Box>

                <Divider />

                {/* UpgradeModal Demo */}
                <Box>
                    <Typography variant="h5" gutterBottom>
                        3. UpgradeModal Component
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        A modal dialog for upgrade prompts. Click the button below to open it.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setUpgradeModalOpen(true)}
                        sx={{ mt: 2 }}
                    >
                        Show UpgradeModal Demo
                    </Button>
                </Box>

                <Divider />

                {/* Usage Examples */}
                <Box>
                    <Typography variant="h5" gutterBottom>
                        Usage Examples
                    </Typography>
                    <Box
                        component="pre"
                        sx={{
                            backgroundColor: 'background.paper',
                            padding: designTokens.spacing.md,
                            borderRadius: designTokens.borderRadius.md,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'auto',
                            fontSize: designTokens.typography.fontSize.sm,
                        }}
                    >
                        {`// LockedFeature
<LockedFeature
  moduleKey="attendance"
  featureName="Biometric Devices"
  description="Connect biometric devices"
  startingPrice={8}
/>

// LockedPage
<LockedPage
  moduleKey="payroll"
  moduleName="Payroll Management"
  description="Automate payroll processing"
  features={['Feature 1', 'Feature 2']}
  startingPrice={12}
/>

// UpgradeModal
<UpgradeModal
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  moduleKey="documents"
  featureName="Document Templates"
  description="Custom templates"
  currentTier="starter"
  requiredTier="business"
/>`}
                    </Box>
                </Box>
            </Stack>

            {/* UpgradeModal */}
            <UpgradeModal
                open={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                moduleKey="documents"
                featureName="Document Templates"
                description="Create and manage custom document templates for automated generation. Build professional documents with your branding and save time with reusable templates."
                currentTier="starter"
                requiredTier="business"
                pricingTiers={[
                    {
                        name: 'Business',
                        price: 8,
                        features: [
                            'All Starter features',
                            'Custom document templates',
                            'Advanced reporting and analytics',
                            'Priority email support',
                            'Custom integrations',
                        ],
                    },
                    {
                        name: 'Enterprise',
                        price: 'Custom',
                        features: [
                            'All Business features',
                            'Unlimited document templates',
                            'Dedicated account manager',
                            'SLA guarantee (99.9% uptime)',
                            'Custom development support',
                            'Advanced security features',
                        ],
                    },
                ]}
                onUpgradeClick={(tier) => {
                    console.log('Upgrade to tier:', tier);
                    setUpgradeModalOpen(false);
                }}
            />
        </Container>
    );
};

export default LicenseComponentsDemo;
