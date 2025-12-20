/**
 * Insurance Service
 * 
 * API service for life insurance module operations.
 * Handles policies, family members, claims, and beneficiaries.
 */

import api from './api';

const insuranceService = {
    // Policy operations
    async getAllPolicies(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/insurance/policies?${queryParams}` : '/insurance/policies';
        return api.get(url);
    },

    async getPolicyById(policyId) {
        return api.get(`/insurance/policies/${policyId}`);
    },

    async createPolicy(policyData) {
        return api.post('/insurance/policies', policyData);
    },

    async updatePolicy(policyId, policyData) {
        return api.put(`/insurance/policies/${policyId}`, policyData);
    },

    async deletePolicy(policyId) {
        return api.delete(`/insurance/policies/${policyId}`);
    },

    // Family member operations
    async getFamilyMembers(policyId) {
        return api.get(`/insurance/policies/${policyId}/family-members`);
    },

    async addFamilyMember(policyId, familyMemberData) {
        return api.post(`/insurance/policies/${policyId}/family-members`, familyMemberData);
    },

    async updateFamilyMember(policyId, familyMemberId, familyMemberData) {
        return api.put(`/insurance/policies/${policyId}/family-members/${familyMemberId}`, familyMemberData);
    },

    async removeFamilyMember(policyId, familyMemberId) {
        return api.delete(`/insurance/policies/${policyId}/family-members/${familyMemberId}`);
    },

    // Beneficiary operations
    async getBeneficiaries(policyId) {
        return api.get(`/insurance/policies/${policyId}/beneficiaries`);
    },

    async addBeneficiary(policyId, beneficiaryData) {
        return api.post(`/insurance/policies/${policyId}/beneficiaries`, beneficiaryData);
    },

    async updateBeneficiary(policyId, beneficiaryId, beneficiaryData) {
        return api.put(`/insurance/policies/${policyId}/beneficiaries/${beneficiaryId}`, beneficiaryData);
    },

    async removeBeneficiary(policyId, beneficiaryId) {
        return api.delete(`/insurance/policies/${policyId}/beneficiaries/${beneficiaryId}`);
    },

    // Claim operations
    async getAllClaims(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/insurance/claims?${queryParams}` : '/insurance/claims';
        return api.get(url);
    },

    async getClaimById(claimId) {
        return api.get(`/insurance/claims/${claimId}`);
    },

    async createClaim(claimData) {
        return api.post('/insurance/claims', claimData);
    },

    async updateClaim(claimId, claimData) {
        return api.put(`/insurance/claims/${claimId}`, claimData);
    },

    async reviewClaim(claimId, reviewData) {
        return api.patch(`/insurance/claims/${claimId}/review`, reviewData);
    },

    async uploadClaimDocument(claimId, formData) {
        return api.post(`/insurance/claims/${claimId}/documents`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Report operations
    async generatePolicyReport(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/insurance/reports/policies?${queryParams}` : '/insurance/reports/policies';
        return api.get(url, {
            responseType: 'blob', // For PDF downloads
        });
    },

    async generateClaimsReport(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/insurance/reports/claims?${queryParams}` : '/insurance/reports/claims';
        return api.get(url, {
            responseType: 'blob', // For PDF downloads
        });
    },

    async getInsuranceAnalytics(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = queryParams ? `/insurance/analytics?${queryParams}` : '/insurance/analytics';
        return api.get(url);
    },

    // Employee lookup for policy creation
    async searchEmployees(searchTerm) {
        return api.get(`/users/search?q=${encodeURIComponent(searchTerm)}&includeInactive=false`);
    },

    // Policy types and configuration
    async getPolicyTypes() {
        return {
            data: [
                { value: 'CAT_A', label: 'Category A', description: 'Basic coverage' },
                { value: 'CAT_B', label: 'Category B', description: 'Standard coverage' },
                { value: 'CAT_C', label: 'Category C', description: 'Premium coverage' }
            ]
        };
    },

    // Relationship types for family members
    async getRelationshipTypes() {
        return {
            data: [
                { value: 'spouse', label: 'Spouse' },
                { value: 'child', label: 'Child' },
                { value: 'parent', label: 'Parent' }
            ]
        };
    }
};

export default insuranceService;