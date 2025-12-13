/**
 * Test script to check slug generation
 */

// Simulate the companyNameToSlug function
const companyNameToSlug = (companyName) => {
    if (!companyName) return '';
    
    return companyName
        .toLowerCase()
        .trim()
        // Replace spaces and special characters with hyphens
        .replace(/[^a-z0-9]+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Replace multiple consecutive hyphens with single hyphen
        .replace(/-+/g, '-');
};

const generateCompanyRoute = (companyName, path = '') => {
    const slug = companyNameToSlug(companyName);
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/company/${slug}${cleanPath}`;
};

console.log('Testing slug generation...\n');

const companyName = 'TechCorp Solutions';
const slug = companyNameToSlug(companyName);
const dashboardRoute = generateCompanyRoute(companyName, '/dashboard');

console.log(`Company Name: "${companyName}"`);
console.log(`Generated Slug: "${slug}"`);
console.log(`Dashboard Route: "${dashboardRoute}"`);

// Test if this matches what we expect
const expectedSlug = 'techcorp-solutions';
const matches = slug === expectedSlug;

console.log(`\nExpected Slug: "${expectedSlug}"`);
console.log(`Matches Expected: ${matches ? '✅' : '❌'}`);

if (!matches) {
    console.log('❌ Slug generation mismatch detected!');
} else {
    console.log('✅ Slug generation is correct');
}