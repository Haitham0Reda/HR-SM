/**
 * Edit Policy Page
 * 
 * Page for editing existing insurance policies.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, CircularProgress, Box } from '@mui/material';
import ModuleGuard from '../../components/ModuleGuard';
import PolicyForm from '../../components/insurance/PolicyForm';
import PageContainer from '../../components/PageContainer';
import { usePolicies } from '../../hooks/useInsurance';
import { useCompanyRouting } from '../../hooks/useCompanyRouting';
import insuranceService from '../../services/insurance.service';

const EditPolicyPage = () => {
    const { policyId } = useParams();
    const navigate = useNavigate();
    const { getCompanyRoute } = useCompanyRouting();
    const { updatePolicy, loading: updateLoading } = usePolicies();
    
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                setLoading(true);
                const response = await insuranceService.getPolicyById(policyId);
                setPolicy(response.data);
            } catch (err) {
                setError(err.message || 'Failed to load policy');
            } finally {
                setLoading(false);
            }
        };

        if (policyId) {
            fetchPolicy();
        }
    }, [policyId]);

    const handleSubmit = async (policyData) => {
        try {
            await updatePolicy(policyId, policyData);
            navigate(getCompanyRoute(`/insurance/policies/${policyId}`));
        } catch (error) {
            // Error handling is done in the hook
            throw error;
        }
    };

    const handleCancel = () => {
        navigate(getCompanyRoute(`/insurance/policies/${policyId}`));
    };

    if (loading) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Edit Insurance Policy"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Edit Policy' }
                    ]}
                >
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                        <CircularProgress />
                    </Box>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (error) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Edit Insurance Policy"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Edit Policy' }
                    ]}
                >
                    <Alert severity="error">{error}</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    if (!policy) {
        return (
            <ModuleGuard moduleId="life-insurance">
                <PageContainer
                    title="Edit Insurance Policy"
                    breadcrumbs={[
                        { title: 'Insurance', path: getCompanyRoute('/insurance') },
                        { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                        { title: 'Edit Policy' }
                    ]}
                >
                    <Alert severity="error">Policy not found</Alert>
                </PageContainer>
            </ModuleGuard>
        );
    }

    const initialValues = {
        employeeId: policy.employeeId,
        employee: policy.employee,
        policyType: policy.policyType,
        coverageAmount: policy.coverageAmount,
        premium: policy.premium,
        startDate: policy.startDate,
        endDate: policy.endDate,
        deductible: policy.deductible || 0,
        notes: policy.notes || ''
    };

    return (
        <ModuleGuard moduleId="life-insurance">
            <PageContainer
                title={`Edit Policy ${policy.policyNumber}`}
                breadcrumbs={[
                    { title: 'Insurance', path: getCompanyRoute('/insurance') },
                    { title: 'Policies', path: getCompanyRoute('/insurance/policies') },
                    { title: policy.policyNumber, path: getCompanyRoute(`/insurance/policies/${policyId}`) },
                    { title: 'Edit' }
                ]}
            >
                <PolicyForm
                    initialValues={initialValues}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isEditMode={true}
                    loading={updateLoading}
                />
            </PageContainer>
        </ModuleGuard>
    );
};

export default EditPolicyPage;