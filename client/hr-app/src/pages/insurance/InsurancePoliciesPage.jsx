/**
 * Insurance Policies Page
 * 
 * Main page for viewing and managing insurance policies.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React from 'react';
import ModuleGuard from '../../components/ModuleGuard';
import PolicyList from '../../components/insurance/PolicyList';

const InsurancePoliciesPage = () => {
    return (
        <ModuleGuard moduleId="life-insurance">
            <PolicyList />
        </ModuleGuard>
    );
};

export default InsurancePoliciesPage;