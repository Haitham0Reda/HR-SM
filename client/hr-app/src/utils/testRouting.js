/**
 * Test routing utilities in browser console
 */

import { companyNameToSlug, generateCompanyRoute } from './companySlug';

export function testCompanyRouting() {
    console.log('🧪 Testing Company Routing...');
    
    // Test company name to slug conversion
    const companyName = 'TechCorp Solutions';
    const slug = companyNameToSlug(companyName);
    console.log(`Company: "${companyName}" → Slug: "${slug}"`);
    
    // Test route generation
    const dashboardRoute = generateCompanyRoute(companyName, '/dashboard');
    console.log(`Dashboard route: ${dashboardRoute}`);
    
    // Test current location
    console.log(`Current location: ${window.location.pathname}`);
    
    // Test expected vs actual
    const expectedRoute = '/company/techcorp-solutions/dashboard';
    console.log(`Expected: ${expectedRoute}`);
    console.log(`Match: ${window.location.pathname === expectedRoute}`);
    
    return {
        companyName,
        slug,
        dashboardRoute,
        currentPath: window.location.pathname,
        expectedRoute,
        matches: window.location.pathname === expectedRoute
    };
}

// Make it available globally for testing
if (typeof window !== 'undefined') {
    window.testCompanyRouting = testCompanyRouting;
}