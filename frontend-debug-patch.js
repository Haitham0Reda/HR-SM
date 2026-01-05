/**
 * Frontend Debug Patch
 * 
 * Add this code to the browser console when on the missions page
 * to debug what's happening with the data
 */

// 1. Check Redux store state
console.log('🔍 Redux Store State:');
console.log('Auth State:', window.__REDUX_DEVTOOLS_EXTENSION__ ? 
    window.store?.getState()?.auth : 'Redux DevTools not available');

// 2. Check localStorage
console.log('🔍 LocalStorage:');
console.log('Token:', localStorage.getItem('tenant_token') ? 'Present' : 'Missing');
console.log('Tenant ID:', localStorage.getItem('tenant_id'));
console.log('User:', localStorage.getItem('user'));

// 3. Test API directly from browser
async function testAPIFromBrowser() {
    const token = localStorage.getItem('tenant_token') || localStorage.getItem('token');
    
    if (!token) {
        console.error('❌ No token found');
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/v1/missions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log('🔍 API Response:', data);
        
        if (data.success && data.data.length > 0) {
            console.log('🔍 Mission Employee Fields:');
            data.data.forEach((mission, i) => {
                console.log(`Mission ${i + 1}:`, {
                    id: mission._id,
                    employee: mission.employee,
                    employeeType: typeof mission.employee,
                    location: mission.location
                });
            });
        }
        
        return data;
    } catch (error) {
        console.error('❌ API Error:', error);
    }
}

// 4. Check current user from auth context
function checkCurrentUser() {
    // Try to get user from React context
    const authContext = document.querySelector('[data-testid="auth-context"]');
    if (authContext) {
        console.log('🔍 Auth Context User:', authContext.dataset.user);
    }
    
    // Check if we can access React DevTools
    if (window.React) {
        console.log('🔍 React available');
    }
}

// 5. Monitor mission service calls
if (window.missionService) {
    const originalGetAll = window.missionService.getAll;
    window.missionService.getAll = function(...args) {
        console.log('🔍 Mission Service getAll called with:', args);
        return originalGetAll.apply(this, args).then(result => {
            console.log('🔍 Mission Service getAll result:', result);
            return result;
        });
    };
}

// Run tests
console.log('🔍 Running frontend debug tests...');
testAPIFromBrowser();
checkCurrentUser();

console.log('🔍 Debug patch applied. Check the logs above for issues.');
console.log('💡 If you see missions in the API response but not on the page, the issue is in the frontend filtering logic.');