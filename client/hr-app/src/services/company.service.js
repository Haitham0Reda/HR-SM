/**
 * Company Service for HR App
 * Handles company-related API calls including email domain management
 */

import api from './api';

// Helper function to get tenant ID from localStorage
const getTenantId = () => {
    return localStorage.getItem('tenant_id');
};

const companyService = {
    /**
     * Get current company information
     */
    getCompanyInfo: async () => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID found');
            }
            
            console.log('CompanyService: Fetching company information for tenant:', tenantId);
            const response = await api.get(`/companies/${tenantId}`);
            console.log('CompanyService: Company info received:', response.data);
            return response;
        } catch (error) {
            console.error('CompanyService: Error fetching company info:', error);
            throw error;
        }
    },

    /**
     * Get company email domain
     */
    getEmailDomain: async () => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID found');
            }
            
            console.log('CompanyService: Fetching email domain for tenant:', tenantId);
            const response = await api.get(`/companies/${tenantId}/email-domain`);
            console.log('CompanyService: Email domain received:', response);
            return response;
        } catch (error) {
            console.error('CompanyService: Error fetching email domain:', error);
            throw error;
        }
    },

    /**
     * Update company email domain (admin only)
     */
    updateEmailDomain: async (emailDomain) => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID found');
            }
            
            console.log('CompanyService: Updating email domain to:', emailDomain, 'for tenant:', tenantId);
            const response = await api.put(`/companies/${tenantId}/email-domain`, { emailDomain });
            console.log('CompanyService: Email domain updated successfully:', response.data);
            return response;
        } catch (error) {
            console.error('CompanyService: Error updating email domain:', error);
            throw error;
        }
    },

    /**
     * Update company information (admin only)
     */
    updateCompany: async (companyData) => {
        try {
            const tenantId = getTenantId();
            if (!tenantId) {
                throw new Error('No tenant ID found');
            }
            
            console.log('CompanyService: Updating company with data:', companyData, 'for tenant:', tenantId);
            const response = await api.put(`/companies/${tenantId}`, companyData);
            console.log('CompanyService: Company updated successfully:', response.data);
            return response;
        } catch (error) {
            console.error('CompanyService: Error updating company:', error);
            throw error;
        }
    },

    /**
     * Validate email domain format
     */
    validateEmailDomain: (domain) => {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        return domainRegex.test(domain);
    },

    /**
     * Generate preview email from user data and domain
     */
    generateEmailPreview: (userData, domain) => {
        if (!domain) return '';
        
        try {
            let emailLocal = '';
            
            // Try username first (primary method)
            if (userData.username) {
                emailLocal = userData.username
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9._\-\s]/g, '') // Keep spaces temporarily for processing
                    .replace(/\s+/g, '.') // Replace spaces with dots
                    .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing special chars
                    .substring(0, 64);
                
                // Apply shortening logic for all usernames to make them shorter
                emailLocal = companyService.shortenEmailLocal(emailLocal);
            }
            // Fallback to first name + last name
            else if (userData.firstName && userData.lastName) {
                const fullName = `${userData.firstName} ${userData.lastName}`;
                emailLocal = fullName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9._\-\s]/g, '') // Remove invalid characters but keep spaces
                    .replace(/\s+/g, '.') // Replace spaces with dots
                    .replace(/^[._-]+|[._-]+$/g, '') // Remove leading/trailing special chars
                    .substring(0, 64); // Limit length
                
                // Apply shortening logic
                emailLocal = companyService.shortenEmailLocal(emailLocal);
            }
            // Check nested personalInfo structure
            else if (userData.personalInfo?.firstName && userData.personalInfo?.lastName) {
                const fullName = `${userData.personalInfo.firstName} ${userData.personalInfo.lastName}`;
                emailLocal = fullName
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9._\-\s]/g, '')
                    .replace(/\s+/g, '.')
                    .replace(/^[._-]+|[._-]+$/g, '')
                    .substring(0, 64);
                
                // Apply shortening logic
                emailLocal = companyService.shortenEmailLocal(emailLocal);
            }
            
            return emailLocal ? `${emailLocal}@${domain}` : '';
        } catch (error) {
            return '';
        }
    },

    /**
     * Shorten email local part for better readability
     * @param {string} emailLocal - The local part of email (before @)
     * @returns {string} Shortened email local part
     */
    shortenEmailLocal: (emailLocal) => {
        if (!emailLocal) return '';
        
        // Split by dots to get name parts
        const parts = emailLocal.split('.');
        
        // If only one part, truncate to max 8 characters for shorter emails
        if (parts.length === 1) {
            return emailLocal.length <= 8 ? emailLocal : emailLocal.substring(0, 8);
        }
        
        // If two parts, create short combinations
        if (parts.length === 2) {
            const [first, last] = parts;
            
            // Strategy 1: first initial + last name (max 6 chars total)
            const firstInitialLast = `${first.charAt(0)}.${last}`;
            if (firstInitialLast.length <= 6) {
                return firstInitialLast;
            }
            
            // Strategy 2: first name + last initial (max 6 chars total)  
            const firstLastInitial = `${first}.${last.charAt(0)}`;
            if (firstLastInitial.length <= 6) {
                return firstLastInitial;
            }
            
            // Strategy 3: first initial + last initial (always short)
            return `${first.charAt(0)}.${last.charAt(0)}`;
        }
        
        // If three parts, use special rule: full first name + 3 chars from middle + 2 chars from last
        if (parts.length === 3) {
            const [first, middle, last] = parts;
            const middlePart = middle.substring(0, 3);
            const lastPart = last.substring(0, 2);
            return `${first}.${middlePart}.${lastPart}`;
        }
        
        // If more than three parts, use first + 3 chars from second-to-last + 2 chars from last
        if (parts.length > 3) {
            const first = parts[0];
            const secondToLast = parts[parts.length - 2];
            const last = parts[parts.length - 1];
            const middlePart = secondToLast.substring(0, 3);
            const lastPart = last.substring(0, 2);
            return `${first}.${middlePart}.${lastPart}`;
        }
        
        return emailLocal.substring(0, 6);
    }
};

export default companyService;