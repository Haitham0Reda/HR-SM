/**
 * Debug utility for User Activity Tracker
 * Run this in browser console to debug issues
 */

export const debugUserActivityTracker = () => {
    console.log('🔍 Debugging User Activity Tracker...');
    
    // Check current URL
    console.log('Current URL:', window.location.href);
    console.log('Current pathname:', window.location.pathname);
    
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    console.log('Auth token exists:', !!token);
    
    // Check React Router
    console.log('React Router location:', window.location);
    
    // Check if component is mounted
    const activityTrackerElement = document.querySelector('[data-testid="user-activity-tracker"]');
    console.log('Activity Tracker element found:', !!activityTrackerElement);
    
    // Check for errors in console
    console.log('Check browser console for any React errors or warnings');
    
    // Test API endpoint
    if (token) {
        fetch('/api/v1/platform/company-logs/techcorp-solutions-d8f0689c/real-time-sessions', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('API test response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('API test response data:', data);
        })
        .catch(error => {
            console.error('API test error:', error);
        });
    }
    
    return {
        url: window.location.href,
        hasToken: !!token,
        hasElement: !!activityTrackerElement
    };
};

// Auto-run if in development
if (process.env.NODE_ENV === 'development') {
    window.debugUserActivityTracker = debugUserActivityTracker;
    console.log('💡 Run debugUserActivityTracker() in console to debug the User Activity Tracker');
}