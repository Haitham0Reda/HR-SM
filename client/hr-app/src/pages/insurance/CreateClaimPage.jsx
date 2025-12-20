/**
 * Create Claim Page
 * 
 * Page for creating new insurance claims.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModuleGuard from '../../components/ModuleGuard';
import ClaimForm from '../../components/insurance/ClaimForm';
import PageContainer from '../../components/PageContainer';
import { useClaims } from '../../hooks/useInsurance';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';

const CreateClaimPage = () => {
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { createClaim, loading } = useClaims();

    const handleSubmit = async (claimData) => {
        try {
            const newClaim = await createClaim(claimData);
            navigate(getCompanyRoute(`/insurance/claims/${newClaim._id}`));
        } catch (error) {
            // Error handling is done in the hook
            throw error;
        }
    };

    const handleCancel = () => {
        navigate(getCompanyRoute('/insurance/claims'));
    };

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title="Submit Insurance Claim"
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Claims', path: getCompanyRoute('/insurance/claims') },
                    { title: 'Submit Claim' }
                ]}
            >
                <ClaimForm
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    loading={loading}
                />
            </PageContainer>
        </ModuleGuard>
    );
};

export default CreateClaimPage;