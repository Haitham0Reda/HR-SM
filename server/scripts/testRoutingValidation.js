/**
 * Test script to debug routing validation
 */

// Simulate the routing functions
const companyNameToSlug = (companyName) => {
    if (!companyName) return '';
    
    return companyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
};

const extractCompanySlug = (pathname) => {
    const match = pathname.match(/^\/company\/([^\/]+)/);
    return match ? match[1] : null;
};

const validateSlugMatch = (slug, companyName) => {
    if (!slug || !companyName) return false;
    return companyNameToSlug(companyName) === slug;
};

console.log('Testing routing validation...\n');

// Test scenarios
const testCases = [
    {
        pathname: '/company/techcorp-solutions/dashboard',
        companyName: 'TechCorp Solutions',
        description: 'Normal dashboard access'
    },
    {
        pathname: '/company/techcorp-solutions/',
        companyName: 'TechCorp Solutions',
        description: 'Company root path'
    },
    {
        pathname: '/company/wrong-company/dashboard',
        companyName: 'TechCorp Solutions',
        description: 'Wrong company slug'
    },
    {
        pathname: '/login',
        companyName: 'TechCorp Solutions',
        description: 'Login page'
    }
];

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.description}`);
    console.log(`  Pathname: ${testCase.pathname}`);
    console.log(`  Company Name: ${testCase.companyName}`);
    
    const isCompanyRoute = testCase.pathname.startsWith('/company/');
    const currentCompanySlug = extractCompanySlug(testCase.pathname);
    const expectedSlug = companyNameToSlug(testCase.companyName);
    const isValidCompanyRoute = isCompanyRoute && validateSlugMatch(currentCompanySlug, testCase.companyName);
    
    console.log(`  Is Company Route: ${isCompanyRoute}`);
    console.log(`  Current Slug: ${currentCompanySlug}`);
    console.log(`  Expected Slug: ${expectedSlug}`);
    console.log(`  Is Valid Company Route: ${isValidCompanyRoute}`);
    console.log(`  Should Redirect: ${isCompanyRoute && !isValidCompanyRoute}`);
    console.log('');
});

// Test the specific case that might be failing
console.log('=== Specific Test Case ===');
const pathname = '/company/techcorp-solutions/dashboard';
const companyName = 'TechCorp Solutions';
const tenantName = 'TechCorp Solutions'; // From tenant API

console.log(`Testing with pathname: ${pathname}`);
console.log(`Company name from auth: ${companyName}`);
console.log(`Tenant name from API: ${tenantName}`);

const slug = extractCompanySlug(pathname);
const expectedSlug1 = companyNameToSlug(companyName);
const expectedSlug2 = companyNameToSlug(tenantName);
const isValid1 = validateSlugMatch(slug, companyName);
const isValid2 = validateSlugMatch(slug, tenantName);

console.log(`Extracted slug: ${slug}`);
console.log(`Expected from auth: ${expectedSlug1}`);
console.log(`Expected from tenant: ${expectedSlug2}`);
console.log(`Valid with auth name: ${isValid1}`);
console.log(`Valid with tenant name: ${isValid2}`);