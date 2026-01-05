/**
 * Temporary Bypass Filter
 * 
 * This temporarily shows ALL missions regardless of user to test if data is coming through
 * Paste this in browser console on the missions page
 */

// Override the getFilteredData function temporarily
if (window.React && window.ReactDOM) {
    console.log('🔧 Temporarily bypassing mission filtering to show all data...');
    
    // This is a hack to test if data is coming through
    // In a real app, you'd modify the component directly
    
    // Check if we can access the component state
    const missionElements = document.querySelectorAll('[data-testid="missions-page"], .MuiBox-root');
    
    if (missionElements.length > 0) {
        console.log('📍 Found mission page elements');
        
        // Try to trigger a re-render with all data
        const event = new CustomEvent('showAllMissions', { 
            detail: { bypassFilter: true } 
        });
        window.dispatchEvent(event);
    }
}

// Alternative: Check what's in the component state
console.log('🔍 Checking component state...');

// Look for React Fiber nodes (development mode)
const findReactComponent = (element) => {
    for (let key in element) {
        if (key.startsWith('__reactInternalInstance$') || key.startsWith('__reactFiber$')) {
            return element[key];
        }
    }
    return null;
};

// Try to find the missions component
const missionPageElement = document.querySelector('div[class*="MuiBox-root"]');
if (missionPageElement) {
    const reactComponent = findReactComponent(missionPageElement);
    if (reactComponent) {
        console.log('🔍 Found React component:', reactComponent);
        
        // Try to access the component's state/props
        let current = reactComponent;
        while (current) {
            if (current.memoizedState || current.memoizedProps) {
                console.log('📊 Component state/props:', {
                    state: current.memoizedState,
                    props: current.memoizedProps
                });
                break;
            }
            current = current.return;
        }
    }
}

console.log('💡 If you see missions data above but not on the page, the issue is in the filtering logic.');
console.log('💡 If you see no missions data, the issue is in the API call or data fetching.');