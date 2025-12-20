/**
 * Insurance Hooks
 * 
 * Custom React hooks for insurance operations.
 * Provides state management and API integration for policies, claims, and family members.
 */

import { useState, useEffect, useCallback } from 'react';
import insuranceService from '../services/insurance.service';
import useNotifications from './useNotifications/useNotifications';

/**
 * Hook for managing insurance policies
 */
export const usePolicies = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const notifications = useNotifications();

    const fetchPolicies = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);
            const response = await insuranceService.getAllPolicies(params);
            setPolicies(response.data || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch policies');
            notifications.show('Failed to load policies', { severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const createPolicy = useCallback(async (policyData) => {
        try {
            setLoading(true);
            const response = await insuranceService.createPolicy(policyData);
            setPolicies(prev => [...prev, response.data]);
            notifications.show('Policy created successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to create policy';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const updatePolicy = useCallback(async (policyId, policyData) => {
        try {
            setLoading(true);
            const response = await insuranceService.updatePolicy(policyId, policyData);
            setPolicies(prev => prev.map(p => p._id === policyId ? response.data : p));
            notifications.show('Policy updated successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to update policy';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const deletePolicy = useCallback(async (policyId) => {
        try {
            setLoading(true);
            await insuranceService.deletePolicy(policyId);
            setPolicies(prev => prev.filter(p => p._id !== policyId));
            notifications.show('Policy deleted successfully', { severity: 'success' });
        } catch (err) {
            const errorMessage = err.message || 'Failed to delete policy';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    return {
        policies,
        loading,
        error,
        fetchPolicies,
        createPolicy,
        updatePolicy,
        deletePolicy,
        refetch: fetchPolicies
    };
};

/**
 * Hook for managing insurance claims
 */
export const useClaims = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const notifications = useNotifications();

    const fetchClaims = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);
            const response = await insuranceService.getAllClaims(params);
            setClaims(response.data || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch claims');
            notifications.show('Failed to load claims', { severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const createClaim = useCallback(async (claimData) => {
        try {
            setLoading(true);
            const response = await insuranceService.createClaim(claimData);
            setClaims(prev => [...prev, response.data]);
            notifications.show('Claim submitted successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to submit claim';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const reviewClaim = useCallback(async (claimId, reviewData) => {
        try {
            setLoading(true);
            const response = await insuranceService.reviewClaim(claimId, reviewData);
            setClaims(prev => prev.map(c => c._id === claimId ? response.data : c));
            notifications.show('Claim reviewed successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to review claim';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const uploadDocument = useCallback(async (claimId, file) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('document', file);
            
            const response = await insuranceService.uploadClaimDocument(claimId, formData);
            notifications.show('Document uploaded successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to upload document';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    return {
        claims,
        loading,
        error,
        fetchClaims,
        createClaim,
        reviewClaim,
        uploadDocument,
        refetch: fetchClaims
    };
};

/**
 * Hook for managing family members
 */
export const useFamilyMembers = (policyId) => {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const notifications = useNotifications();

    const fetchFamilyMembers = useCallback(async () => {
        if (!policyId) return;
        
        try {
            setLoading(true);
            setError(null);
            const response = await insuranceService.getFamilyMembers(policyId);
            setFamilyMembers(response.data || []);
        } catch (err) {
            setError(err.message || 'Failed to fetch family members');
            notifications.show('Failed to load family members', { severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, [policyId, notifications]);

    const addFamilyMember = useCallback(async (familyMemberData) => {
        if (!policyId) return;
        
        try {
            setLoading(true);
            const response = await insuranceService.addFamilyMember(policyId, familyMemberData);
            setFamilyMembers(prev => [...prev, response.data]);
            notifications.show('Family member added successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to add family member';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [policyId, notifications]);

    const updateFamilyMember = useCallback(async (familyMemberId, familyMemberData) => {
        if (!policyId) return;
        
        try {
            setLoading(true);
            const response = await insuranceService.updateFamilyMember(policyId, familyMemberId, familyMemberData);
            setFamilyMembers(prev => prev.map(fm => fm._id === familyMemberId ? response.data : fm));
            notifications.show('Family member updated successfully', { severity: 'success' });
            return response.data;
        } catch (err) {
            const errorMessage = err.message || 'Failed to update family member';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [policyId, notifications]);

    const removeFamilyMember = useCallback(async (familyMemberId) => {
        if (!policyId) return;
        
        try {
            setLoading(true);
            await insuranceService.removeFamilyMember(policyId, familyMemberId);
            setFamilyMembers(prev => prev.filter(fm => fm._id !== familyMemberId));
            notifications.show('Family member removed successfully', { severity: 'success' });
        } catch (err) {
            const errorMessage = err.message || 'Failed to remove family member';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [policyId, notifications]);

    useEffect(() => {
        fetchFamilyMembers();
    }, [fetchFamilyMembers]);

    return {
        familyMembers,
        loading,
        error,
        addFamilyMember,
        updateFamilyMember,
        removeFamilyMember,
        refetch: fetchFamilyMembers
    };
};

/**
 * Hook for insurance reports and analytics
 */
export const useInsuranceReports = () => {
    const [loading, setLoading] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const notifications = useNotifications();

    const generateReport = useCallback(async (reportType, params = {}) => {
        try {
            setLoading(true);
            let response;
            
            if (reportType === 'policies') {
                response = await insuranceService.generatePolicyReport(params);
            } else if (reportType === 'claims') {
                response = await insuranceService.generateClaimsReport(params);
            } else {
                throw new Error('Invalid report type');
            }

            // Create download link for PDF
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            notifications.show('Report generated successfully', { severity: 'success' });
        } catch (err) {
            const errorMessage = err.message || 'Failed to generate report';
            notifications.show(errorMessage, { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    const fetchAnalytics = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            const response = await insuranceService.getInsuranceAnalytics(params);
            setAnalytics(response.data);
        } catch (err) {
            notifications.show('Failed to load analytics', { severity: 'error' });
            throw err;
        } finally {
            setLoading(false);
        }
    }, [notifications]);

    return {
        loading,
        analytics,
        generateReport,
        fetchAnalytics
    };
};