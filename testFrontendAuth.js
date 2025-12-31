/**
 * Test frontend authentication and departments access
 */
import puppeteer from 'puppeteer';

async function testFrontendAuth() {
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
        devtools: true 
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            console.log('BROWSER:', msg.text());
        });
        
        // Enable request/response logging
        page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`API Response: ${response.status()} ${response.url()}`);
            }
        });
        
        console.log('🌐 Navigating to departments page...');
        await page.goto('http://localhost:3000/company/techcorp_solutions/departments', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait a bit for any async operations
        await page.waitForTimeout(3000);
        
        // Check if we're on the right page
        const url = page.url();
        console.log('📍 Current URL:', url);
        
        // Check for any error messages
        const errorElements = await page.$$eval('[role="alert"], .error, .MuiAlert-root', 
            elements => elements.map(el => el.textContent)
        );
        
        if (errorElements.length > 0) {
            console.log('❌ Error messages found:', errorElements);
        }
        
        // Check localStorage for tokens
        const localStorage = await page.evaluate(() => {
            return {
                tenant_token: localStorage.getItem('tenant_token'),
                tenant_id: localStorage.getItem('tenant_id'),
                user: localStorage.getItem('user')
            };
        });
        
        console.log('🔑 LocalStorage tokens:');
        console.log('   tenant_token:', localStorage.tenant_token ? 'Present' : 'Missing');
        console.log('   tenant_id:', localStorage.tenant_id);
        console.log('   user:', localStorage.user ? 'Present' : 'Missing');
        
        // Check if departments are loaded
        const departmentElements = await page.$$('.MuiCard-root, [data-testid="department-card"]');
        console.log(`📁 Department cards found: ${departmentElements.length}`);
        
        // Check for loading state
        const loadingElements = await page.$$('[data-testid="loading"], .MuiCircularProgress-root');
        console.log(`⏳ Loading indicators: ${loadingElements.length}`);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'departments-page-debug.png', fullPage: true });
        console.log('📸 Screenshot saved as departments-page-debug.png');
        
        // Wait for user to inspect
        console.log('\n🔍 Browser opened for inspection. Press Enter to close...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testFrontendAuth();