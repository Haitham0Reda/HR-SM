// Setup file to ensure window object is available for frontend module mocks
// This runs before any tests to prevent ReferenceError issues

// Create comprehensive window mock
if (typeof window === 'undefined') {
  global.window = {
    // Make PerformanceObserver undefined to prevent instantiation issues
    PerformanceObserver: undefined,
    
    // Mock other window properties that might be accessed
    performance: {
      getEntriesByType: function() { return []; },
      now: function() { return Date.now(); }
    },
    
    navigator: {
      userAgent: 'Jest Test Environment',
      language: 'en-US',
      platform: 'Node.js',
      cookieEnabled: false,
      doNotTrack: null,
      hardwareConcurrency: 4,
      maxTouchPoints: 0,
      connection: null,
      plugins: []
    },
    
    screen: {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24
    },
    
    localStorage: {
      getItem: function() { return null; },
      setItem: function() {},
      removeItem: function() {},
      clear: function() {}
    },
    
    document: {
      referrer: '',
      createElement: function() {
        return {
          getContext: function() { 
            return {
              measureText: function() { return { width: 0 }; }
            };
          },
          toDataURL: function() { return ''; },
          measureText: function() { return { width: 0 }; }
        };
      },
      addEventListener: function() {}
    },
    
    location: { 
      pathname: '/',
      href: 'http://localhost',
      origin: 'http://localhost'
    },
    
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: function() {},
    removeEventListener: function() {},
    fetch: function() { return Promise.resolve({ ok: true }); }
  };
  
  // Add XMLHttpRequest to global scope
  global.XMLHttpRequest = class {
    constructor() {
      this.onreadystatechange = null;
      this.readyState = 0;
      this.responseText = '';
      this.status = 0;
      this.statusText = '';
    }
    
    open(method, url, async, user, password) {
      this.method = method;
      this.url = url;
    }
    
    send(data) {
      this.readyState = 4;
      this.status = 200;
      this.statusText = 'OK';
      if (this.onreadystatechange) {
        this.onreadystatechange();
      }
    }
    
    setRequestHeader(header, value) {}
  };
  
  // Also add it to window object
  global.window.XMLHttpRequest = global.XMLHttpRequest;
  
  // Set other globals that might be needed
  global.document = global.window.document;
  global.navigator = global.window.navigator;
  global.screen = global.window.screen;
  global.localStorage = global.window.localStorage;
  global.performance = global.window.performance;
  
  // Add MutationObserver to global scope
  global.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
  
  // Also add it to window object
  global.window.MutationObserver = global.MutationObserver;
}

// Export nothing, this is just for setup
export default {};