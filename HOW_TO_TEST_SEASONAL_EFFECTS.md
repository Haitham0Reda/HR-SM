# 🧪 How to Test Seasonal Effects - Step by Step

## Quick Test (2 minutes)

### Step 1: Add Simple Test to Your Router

Open your router file (usually `App.js` or where routes are defined) and add:

```javascript
import SimpleSeasonalTest from "./SimpleSeasonalTest";

// In your routes:
<Route path="/test-simple" element={<SimpleSeasonalTest />} />;
```

### Step 2: Navigate to Test Page

Go to: `http://localhost:3000/test-simple`

### Step 3: What You Should See

✅ **Success**: 10 white snowflakes falling from top to bottom  
❌ **Problem**: Nothing appears or errors in console

---

## If Simple Test Works ✅

The basic animation system is working! Now test the full system:

### Step 1: Add Full Test

```javascript
import TestSeasonalEffects from "./components/seasonal/TestSeasonalEffects";

<Route path="/test-seasonal" element={<TestSeasonalEffects />} />;
```

### Step 2: Navigate

Go to: `http://localhost:3000/test-seasonal`

### Step 3: Test Each Season

Edit `TestSeasonalEffects.jsx` and change `manualSeason`:

```javascript
manualSeason: "christmas"; // See snow ❄
manualSeason: "newyear"; // See fireworks 🎆
manualSeason: "eid-fitr"; // See moon 🌙
manualSeason: "eid-adha"; // See lanterns 🏮
```

---

## If Simple Test Fails ❌

### Check 1: Browser Console

1. Press F12 to open DevTools
2. Go to Console tab
3. Look for errors (red text)
4. Look for these messages:
   - "🎄 SimpleSeasonalTest mounted"
   - "Created snowflake 1" through "Created snowflake 10"
   - "✅ Snowflakes created successfully"

### Check 2: Element Inspector

1. Press F12
2. Go to Elements/Inspector tab
3. Search for: `simple-snowflake`
4. Should find 10 elements

### Check 3: Run Console Commands

In browser console, run:

```javascript
// Should return 10
document.querySelectorAll(".simple-snowflake").length;

// Should return the container
document.getElementById("simple-seasonal-test");

// Should show the snowflakes
document.querySelectorAll(".simple-snowflake");
```

### Check 4: Browser Settings

- **Animations disabled?** Check browser settings
- **Hardware acceleration?** Try enabling/disabling
- **Extensions blocking?** Try incognito mode
- **Old browser?** Update to latest version

---

## Integration with Your App

Once tests work, integrate into your main app:

### Option 1: Add to App.js

```javascript
import { useState, useEffect } from "react";
import SeasonalEffectsManager from "./components/seasonal/SeasonalEffectsManager";
import "./components/seasonal/SeasonalEffects.css";

function App() {
  const [seasonalSettings, setSeasonalSettings] = useState(() => {
    const saved = localStorage.getItem("seasonalSettings");
    return saved
      ? JSON.parse(saved)
      : {
          enabled: true,
          autoDetect: true,
          manualSeason: null,
          opacity: 0.8,
          enableMobile: true,
          christmas: { enabled: true, snow: true },
          newyear: { enabled: true, fireworks: true },
          eidFitr: { enabled: true, moon: true },
          eidAdha: { enabled: true, lantern: true },
        };
  });

  return (
    <div>
      {/* Your app content */}
      <YourRoutes />

      {/* Seasonal Effects - Add at the end */}
      <SeasonalEffectsManager settings={seasonalSettings} />
    </div>
  );
}
```

### Option 2: Add to Layout Component

```javascript
// In your Layout.jsx or similar
import SeasonalEffectsManager from './components/seasonal/SeasonalEffectsManager';

function Layout({ children }) {
    const settings = /* get from context or props */;

    return (
        <div>
            {children}
            <SeasonalEffectsManager settings={settings} />
        </div>
    );
}
```

---

## Testing Checklist

- [ ] Simple test shows snowflakes
- [ ] No console errors
- [ ] Christmas (snow) works
- [ ] New Year (fireworks) works
- [ ] Eid al-Fitr (moon) works
- [ ] Eid al-Adha (lanterns) works
- [ ] Opacity control works
- [ ] Mobile toggle works
- [ ] Auto-detect works
- [ ] Manual override works

---

## Common Issues & Fixes

### Issue: "Cannot find module"

**Fix**: Check file paths match exactly:

```
client/src/
├── components/
│   └── seasonal/
│       ├── SeasonalEffectsManager.jsx
│       ├── SeasonalEffects.css
│       └── effects/
│           ├── SnowEffect.jsx
│           ├── FireworksEffect.jsx
│           ├── MoonEffect.jsx
│           └── LanternEffect.jsx
└── hooks/
    ├── useSeasonDetector.js
    └── useMobileCheck.js
```

### Issue: Effects appear but don't move

**Fix**: CSS not loaded. Add to App.js:

```javascript
import "./components/seasonal/SeasonalEffects.css";
```

### Issue: Fireworks don't show

**Fix**: Canvas might not be supported. Check console for errors.

### Issue: Nothing on mobile

**Fix**: Check `enableMobile: true` in settings.

---

## Performance Testing

### Check FPS

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Let it run for 5 seconds
5. Stop recording
6. Check FPS (should be 60fps)

### If Performance is Bad

1. Reduce opacity: `opacity: 0.5`
2. Disable on mobile: `enableMobile: false`
3. Disable unused seasons
4. Close other browser tabs

---

## Next Steps

1. ✅ Run simple test
2. ✅ Run full test
3. ✅ Test each season
4. ✅ Integrate into app
5. ✅ Test on mobile
6. ✅ Test performance
7. ✅ Deploy!

---

## Need Help?

**Still not working?** Provide:

1. Browser & version
2. Console errors (screenshot)
3. Results from console commands
4. What you see vs what you expect
5. Settings object you're using

Check `TROUBLESHOOTING_SEASONAL_EFFECTS.md` for detailed debugging.

---

**Good luck! 🎉**
