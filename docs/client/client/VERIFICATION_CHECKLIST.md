# Build Configuration Verification Checklist

Use this checklist to verify the build configuration is working correctly.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm 8+ installed
- [ ] All dependencies installed (`npm run install:all`)

## Development Server Tests

### Test 1: Start HR-App Individually
```bash
cd client
npm run start:hr
```
**Expected Results:**
- [ ] Server starts on port 3000
- [ ] No browser auto-opens
- [ ] Console shows "Compiled successfully"
- [ ] Can access http://localhost:3000
- [ ] Hot reload works when editing files

### Test 2: Start Platform-Admin Individually
```bash
cd client
npm run start:platform
```
**Expected Results:**
- [ ] Server starts on port 3001
- [ ] No browser auto-opens
- [ ] Console shows "Compiled successfully"
- [ ] Can access http://localhost:3001
- [ ] Hot reload works when editing files

### Test 3: Start Both Applications Concurrently
```bash
cd client
npm run dev
```
**Expected Results:**
- [ ] Both servers start simultaneously
- [ ] HR-APP output in cyan color
- [ ] PLATFORM output in magenta color
- [ ] HR-App accessible on port 3000
- [ ] Platform-Admin accessible on port 3001
- [ ] Both apps have hot reload working

## Build Tests

### Test 4: Build HR-App
```bash
cd client
npm run build:hr
```
**Expected Results:**
- [ ] Build completes without errors
- [ ] `hr-app/build/` directory created
- [ ] Contains index.html
- [ ] Contains static/ directory with JS and CSS
- [ ] Build size is reasonable (check console output)

### Test 5: Build Platform-Admin
```bash
cd client
npm run build:platform
```
**Expected Results:**
- [ ] Build completes without errors
- [ ] `platform-admin/build/` directory created
- [ ] Contains index.html
- [ ] Contains static/ directory with JS and CSS
- [ ] Build size is reasonable (check console output)

### Test 6: Build Both Applications
```bash
cd client
npm run build:all
```
**Expected Results:**
- [ ] Both builds complete successfully
- [ ] Both build directories exist
- [ ] No errors in console
- [ ] Total build time is reasonable

### Test 7: Production Build
```bash
cd client
npm run build:production
```
**Expected Results:**
- [ ] NODE_ENV=production is set
- [ ] Both apps build with production optimizations
- [ ] Smaller bundle sizes than development
- [ ] Source maps generated
- [ ] No warnings about development mode

## Webpack Configuration Tests

### Test 8: Shared Component Imports
Create a test file in hr-app:
```javascript
// hr-app/src/test-shared.js
import { Button } from '@shared/ui-kit/Button';
console.log('Shared import works:', Button);
```
**Expected Results:**
- [ ] No import errors
- [ ] Webpack resolves @shared alias
- [ ] Component imports successfully

### Test 9: Code Splitting
Check build output:
```bash
cd client
npm run build:production
ls -la hr-app/build/static/js/
```
**Expected Results:**
- [ ] Multiple JS chunks created
- [ ] Vendor chunk exists (vendors.*.js)
- [ ] Shared chunk exists (shared.*.js)
- [ ] Main chunk exists (main.*.js)

### Test 10: Public Path Configuration
Check built index.html:
```bash
cd client
cat hr-app/build/index.html | grep -i "href\|src"
```
**Expected Results:**
- [ ] HR-App uses `/hr-app/` prefix
- [ ] Platform-Admin uses `/platform-admin/` prefix
- [ ] All asset paths are correct

## Testing Tests

### Test 11: Run HR-App Tests
```bash
cd client
npm run test:hr
```
**Expected Results:**
- [ ] Tests run without errors
- [ ] All tests pass
- [ ] Test summary displayed
- [ ] Process exits (not in watch mode)

### Test 12: Run Platform-Admin Tests
```bash
cd client
npm run test:platform
```
**Expected Results:**
- [ ] Tests run without errors
- [ ] All tests pass
- [ ] Test summary displayed
- [ ] Process exits (not in watch mode)

### Test 13: Run All Tests
```bash
cd client
npm run test:all
```
**Expected Results:**
- [ ] Both test suites run
- [ ] All tests pass
- [ ] Combined test summary
- [ ] Process exits cleanly

## Linting Tests

### Test 14: Lint HR-App
```bash
cd client
npm run lint:hr
```
**Expected Results:**
- [ ] Linter runs successfully
- [ ] No critical errors
- [ ] Warnings (if any) are acceptable

### Test 15: Lint Platform-Admin
```bash
cd client
npm run lint:platform
```
**Expected Results:**
- [ ] Linter runs successfully
- [ ] No critical errors
- [ ] Warnings (if any) are acceptable

### Test 16: Lint All
```bash
cd client
npm run lint:all
```
**Expected Results:**
- [ ] Both apps linted
- [ ] No critical errors
- [ ] Process completes successfully

## Cleaning Tests

### Test 17: Clean Build Artifacts
```bash
cd client
npm run clean
```
**Expected Results:**
- [ ] hr-app/build/ removed
- [ ] platform-admin/build/ removed
- [ ] node_modules/.cache removed from both
- [ ] No errors during cleanup
- [ ] Works on Windows, macOS, and Linux

## Cross-Platform Tests

### Test 18: Windows Compatibility
On Windows:
```bash
cd client
npm run dev
npm run build:all
npm run clean
```
**Expected Results:**
- [ ] All commands work without errors
- [ ] No "command not found" errors
- [ ] Paths resolve correctly
- [ ] Environment variables set correctly

### Test 19: macOS/Linux Compatibility
On macOS or Linux:
```bash
cd client
npm run dev
npm run build:all
npm run clean
```
**Expected Results:**
- [ ] All commands work without errors
- [ ] No permission issues
- [ ] Paths resolve correctly
- [ ] Environment variables set correctly

## Integration Tests

### Test 20: Full Development Workflow
```bash
cd client
npm run install:all
npm run dev
# Make a change to a component
# Verify hot reload works
# Stop servers (Ctrl+C)
npm run build:all
npm run test:all
npm run lint:all
npm run clean
```
**Expected Results:**
- [ ] All steps complete successfully
- [ ] No errors at any stage
- [ ] Hot reload works during development
- [ ] Builds are optimized
- [ ] Tests pass
- [ ] Linting passes
- [ ] Cleanup works

### Test 21: Serve Production Build
```bash
cd client
npm run build:production
# Serve hr-app/build with a static server
npx serve -s hr-app/build -l 8000
# Serve platform-admin/build with a static server
npx serve -s platform-admin/build -l 8001
```
**Expected Results:**
- [ ] HR-App serves correctly on port 8000
- [ ] Platform-Admin serves correctly on port 8001
- [ ] All routes work (client-side routing)
- [ ] Assets load correctly
- [ ] No console errors
- [ ] API calls work (if backend is running)

## Performance Tests

### Test 22: Build Performance
```bash
cd client
time npm run build:production
```
**Expected Results:**
- [ ] Build completes in reasonable time (< 5 minutes)
- [ ] No memory issues
- [ ] CPU usage is acceptable

### Test 23: Bundle Size Analysis
Check build output:
```bash
cd client
npm run build:production
# Check bundle sizes
du -sh hr-app/build/static/js/*
du -sh platform-admin/build/static/js/*
```
**Expected Results:**
- [ ] Main bundle < 500KB (gzipped)
- [ ] Vendor bundle < 1MB (gzipped)
- [ ] Total bundle size is reasonable
- [ ] No unexpectedly large chunks

## Documentation Tests

### Test 24: Documentation Completeness
**Expected Results:**
- [ ] BUILD_CONFIGURATION.md exists and is complete
- [ ] DEPLOYMENT_GUIDE.md exists and is complete
- [ ] QUICK_START.md exists and is complete
- [ ] BUILD_SETUP_SUMMARY.md exists and is complete
- [ ] All documentation is accurate
- [ ] Examples work as documented

## Final Verification

### Test 25: Complete System Test
```bash
# Start backend
npm run server

# In another terminal, start frontend
cd client
npm run dev

# Test both applications
# - Login to HR-App
# - Login to Platform-Admin
# - Verify all features work
# - Check browser console for errors
# - Check network tab for API calls
```
**Expected Results:**
- [ ] Backend starts successfully
- [ ] Both frontends start successfully
- [ ] Can login to both applications
- [ ] All features work correctly
- [ ] No console errors
- [ ] API calls succeed
- [ ] Authentication works
- [ ] Routing works in both apps

## Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Platform:** [ ] Windows [ ] macOS [ ] Linux  
**Node Version:** ___________________  
**npm Version:** ___________________  

**Overall Status:** [ ] PASS [ ] FAIL

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## Troubleshooting Common Issues

### Issue: Port already in use
**Solution:** Change PORT in .env file or kill the process using the port

### Issue: Module not found
**Solution:** Run `npm run install:all`

### Issue: Build fails
**Solution:** Run `npm run clean` then rebuild

### Issue: Hot reload not working
**Solution:** Restart dev server, check file watchers

### Issue: Tests fail
**Solution:** Check test output, verify dependencies are installed

### Issue: Cross-platform script errors
**Solution:** Ensure cross-env and rimraf are installed

---

**Last Updated:** December 9, 2025
