# 🔧 Troubleshooting Seasonal Effects

## Common Issues & Solutions

### Issue 1: "Not working" - Nothing appears

#### Possible Causes:

1. **CSS not imported**

   ```javascript
   // Make sure this is in your App.js or main component
   import "./components/seasonal/SeasonalEffects.css";
   ```

2. **Settings not configured correctly**

   ```javascript
   // Check your settings object
   const settings = {
     enabled: true, // Must be true
     autoDetect: false, // Set to false for testing
     manualSeason: "christmas", // Force a season
     // ... rest of settings
   };
   ```

3. **Component not rendered**

   ```javascript
   // Make sure SeasonalEffectsManager is in your JSX
   <SeasonalEffectsManager settings={settings} />
   ```

4. **Z-index issues**
   - Effects use `z-index: 9999`
   - Check if other elements are covering them

### Issue 2: Effects appear but don't animate

#### Solutions:

1. **Check browser console for errors**

   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check Network tab for failed imports

2. **Verify CSS is loaded**

   - Open DevTools > Elements
   - Search for `.snowflake` or `.seasonal-effects-container`
   - If not found, CSS isn't loaded

3. **Check reduced motion settings**
   ```css
   /* If user has reduced motion enabled, effects are hidden */
   @media (prefers-reduced-motion: reduce) {
     /* Effects disabled */
   }
   ```

### Issue 3: Import errors

#### Error: "Cannot find module"

**Solution**: Check file paths

```javascript
// Correct paths:
import SeasonalEffectsManager from "./components/seasonal/SeasonalEffectsManager";
import { useSeasonDetector } from "./hooks/useSeasonDetector";
import { useMobileCheck } from "./hooks/useMobileCheck";
```

### Issue 4: Hooks errors

#### Error: "Invalid hook call"

**Solution**: Ensure React version compatibility

```bash
npm list react react-dom
# Should be 16.8+ for hooks
```

### Issue 5: Canvas not showing (Fireworks)

#### Solutions:

1. **Check canvas element**

   ```javascript
   // In browser console
   document.querySelector(".fireworks-canvas");
   ```

2. **Verify canvas context**
   - Some browsers block canvas in certain modes
   - Check browser console for errors

### Issue 6: Mobile not working

#### Solutions:

1. **Check enableMobile setting**

   ```javascript
   enableMobile: true; // Must be true for mobile
   ```

2. **Check screen width**

   ```javascript
   // Mobile is < 768px
   console.log(window.innerWidth);
   ```

3. **Test on actual device**
   - Desktop responsive mode may behave differently

## Quick Test

### Step 1: Create Test Component

Create `client/src/TestSeasonalEffects.jsx`:

```javascript
import React from "react";
import SeasonalEffectsManager from "./components/seasonal/SeasonalEffectsManager";
import "./components/seasonal/SeasonalEffects.css";

function TestSeasonalEffects() {
  const settings = {
    enabled: true,
    autoDetect: false,
    manualSeason: "christmas",
    opacity: 0.8,
    enableMobile: true,
    christmas: { enabled: true, snow: true },
    newyear: { enabled: true, fireworks: true },
    eidFitr: { enabled: true, moon: true },
    eidAdha: { enabled: true, lantern: true },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#1a1a2e", padding: "20px" }}>
      <h1 style={{ color: "white" }}>Seasonal Effects Test</h1>
      <p style={{ color: "white" }}>You should see falling snowflakes ❄</p>
      <SeasonalEffectsManager settings={settings} />
    </div>
  );
}

export default TestSeasonalEffects;
```

### Step 2: Add to Router

```javascript
// In your router
import TestSeasonalEffects from "./TestSeasonalEffects";

<Route path="/test-seasonal" element={<TestSeasonalEffects />} />;
```

### Step 3: Navigate and Check

1. Go to `/test-seasonal`
2. You should see snowflakes falling
3. Open browser console - check for errors

## Debugging Checklist

- [ ] CSS file imported
- [ ] Component rendered in JSX
- [ ] Settings object configured correctly
- [ ] `enabled: true`
- [ ] `manualSeason` set (for testing)
- [ ] No console errors
- [ ] Browser supports required features
- [ ] Not in reduced motion mode
- [ ] Z-index not blocked by other elements

## Browser Console Tests

### Test 1: Check if component mounted

```javascript
document.querySelector(".seasonal-effects-container");
// Should return: <div class="seasonal-effects-container">...</div>
```

### Test 2: Check CSS variable

```javascript
getComputedStyle(document.documentElement).getPropertyValue(
  "--decorations-opacity"
);
// Should return: "0.8" or your opacity value
```

### Test 3: Check for snowflakes

```javascript
document.querySelectorAll(".snowflake").length;
// Should return: number > 0 (if Christmas is active)
```

### Test 4: Check canvas

```javascript
document.querySelector(".fireworks-canvas");
// Should return: <canvas> element (if New Year is active)
```

## Still Not Working?

### Minimal Test Case

Create a completely isolated test:

```javascript
// MinimalTest.jsx
import React, { useEffect } from "react";

function MinimalTest() {
  useEffect(() => {
    // Create a simple snowflake
    const container = document.createElement("div");
    container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;

    const snowflake = document.createElement("div");
    snowflake.innerHTML = "❄";
    snowflake.style.cssText = `
            position: absolute;
            top: 0;
            left: 50%;
            font-size: 2em;
            color: white;
            animation: fall 5s linear infinite;
        `;

    container.appendChild(snowflake);
    document.body.appendChild(container);

    // Add animation
    const style = document.createElement("style");
    style.innerHTML = `
            @keyframes fall {
                from { transform: translateY(0); }
                to { transform: translateY(100vh); }
            }
        `;
    document.head.appendChild(style);

    return () => {
      container.remove();
      style.remove();
    };
  }, []);

  return (
    <div style={{ padding: "20px", background: "#1a1a2e", minHeight: "100vh" }}>
      <h1 style={{ color: "white" }}>Minimal Test</h1>
      <p style={{ color: "white" }}>
        You should see ONE snowflake falling in the center
      </p>
    </div>
  );
}

export default MinimalTest;
```

If this works, the issue is with the main implementation.  
If this doesn't work, there's a browser/environment issue.

## Get Help

If still not working, provide:

1. **Browser & Version**: Chrome 120, Firefox 115, etc.
2. **Console Errors**: Copy any red errors
3. **React Version**: From `package.json`
4. **What you see**: Blank screen? Errors? Nothing?
5. **What you expect**: Snowflakes, fireworks, etc.
6. **Settings used**: Your settings object
7. **Test results**: Results from console tests above

## Common Error Messages

### "Cannot read property 'current' of null"

- Component unmounted before ref was set
- Add null checks in useEffect

### "ResizeObserver loop limit exceeded"

- Harmless warning in development
- Can be ignored

### "Failed to execute 'getContext' on 'HTMLCanvasElement'"

- Canvas not supported or blocked
- Check browser compatibility

### "Maximum update depth exceeded"

- Infinite loop in state updates
- Check useEffect dependencies

## Performance Issues

If effects are slow or laggy:

1. **Reduce opacity**: `opacity: 0.5`
2. **Disable on mobile**: `enableMobile: false`
3. **Reduce particle count**: Edit effect files
4. **Check CPU usage**: DevTools > Performance
5. **Close other tabs**: Free up resources

## Next Steps

1. Try the minimal test case
2. Check browser console
3. Verify all files are in correct locations
4. Test with forced season (not auto-detect)
5. Check CSS is loaded
6. Verify React version supports hooks

---

**Need more help?** Check the full documentation in `docs/SEASONAL_EFFECTS_SYSTEM.md`
