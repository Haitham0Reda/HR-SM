/**
 * Create Policy Page
 * 
 * Page for creating new insurance policies.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleGuard from '../../components/ModuleGuard';
import PolicyForm from '../../components/insurance/PolicyForm';
import PageContainer from '../../components/PageContainer';
import { usePolicies } from '../../hooks/useInsurance';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';

const CreatePolicyPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { createPolicy, loading } = usePolicies();

    const handleSubmit = async (policyData) => {
        try {
            const newPolicy = await createPolicy(policyData);
            navigate(getCompanyRoute(`/insurance/policies/${newPolicy._id}`));
        } catch (error) {
            // Error handling is done in the hook
            throw error;
        }
    };

    const handleCancel = () => {
        navigate(getCompanyRoute('/insurance/policies'));
    };

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title="Create Insurance Policy"
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                    { title: 'Create Policy' }
                ]}
            >
                <PolicyForm
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    loading={loading}
                />
            </PageContainer>
        </ModuleGuard>
    );
};

export default CreatePolicyPage;