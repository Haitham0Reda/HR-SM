/**
 * Insurance Reports Page
 * 
 * Main page for insurance reports and analytics.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React from 'react';
import ModuleGuard from '../../components/ModuleGuard';
import InsuranceReportsPanel from '../../components/insurance/InsuranceReportsPanel';
import PageContainer from '../../components/PageContainer';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';

const InsuranceReportsPage = () => {
    const { getCompanyRoute } = useCompanyRouting();

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title="Insurance Reports"
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Reports' }
                ]}
            >
                <InsuranceReportsPanel />
            </PageContainer>
        </ModuleGuard>
    );
};

export default InsuranceReportsPage;