/**
 * Claims Page
 * 
 * Main page for viewing and managing insurance claims.
 * Uses ModuleGuard to check if life-insurance module is enabled.
 */

import React from 'react';
import ModuleGuard from '../../components/ModuleGuard';
import ClaimsList from '../../components/insurance/ClaimsList';

const ClaimsPage = () => {
    return (
        <ModuleGuard moduleId="life-insurance">
            <ClaimsList />
        </ModuleGuard>
    );
};

export default ClaimsPage;