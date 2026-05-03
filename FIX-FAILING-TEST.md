# Fix Guide: Failing authSlice Test

## Problem

One test in the hr-app store suite is now failing after fixing the dual-storage bug:

**Test:** Asserts `localStorage.setItem('tenant_token')` was called inside `loginUser` thunk  
**Why it fails:** The patch correctly removed this localStorage write (it was the bug)  
**Status:** Test is validating the bug, not the correct behavior

---

## Solution

Update the test to assert Redux state instead of localStorage calls.

### Before (Testing the Bug)
```javascript
it('should store token in localStorage on successful login', async () => {
  // ... setup ...
  
  await store.dispatch(loginUser({ email, password, tenantId }));
  
  expect(localStorage.setItem).toHaveBeenCalledWith('tenant_token', mockToken);
  expect(localStorage.setItem).toHaveBeenCalledWith('tenant_id', mockTenantId);
});
```

### After (Testing Correct Behavior)
```javascript
it('should store token in Redux state on successful login', async () => {
  // ... setup ...
  
  await store.dispatch(loginUser({ email, password, tenantId }));
  
  const state = store.getState();
  expect(state.auth.tenantToken).toBe(mockToken);
  expect(state.auth.tenantId).toBe(mockTenantId);
  expect(state.auth.isAuthenticated).toBe(true);
  
  // Verify localStorage is NOT written directly (redux-persist handles it)
  expect(localStorage.setItem).not.toHaveBeenCalledWith('tenant_token', expect.anything());
  expect(localStorage.setItem).not.toHaveBeenCalledWith('tenant_id', expect.anything());
});
```

---

## Additional Test Cases to Add

### 1. Legacy Token Migration
```javascript
it('should migrate legacy tokens from localStorage on setTokensFromStorage', () => {
  localStorage.setItem('tenant_token', 'legacy-token');
  localStorage.setItem('tenant_id', 'legacy-tenant');
  
  const state = { auth: { tenantToken: null, tenantId: null } };
  const action = { type: 'auth/setTokensFromStorage' };
  
  const newState = authReducer(state, action);
  
  expect(newState.tenantToken).toBe('legacy-token');
  expect(newState.tenantId).toBe('legacy-tenant');
  
  // Verify legacy keys are cleaned up
  expect(localStorage.getItem('tenant_token')).toBeNull();
  expect(localStorage.getItem('tenant_id')).toBeNull();
});
```

### 2. Token Refresh Flow
```javascript
it('should update token on successful refresh', async () => {
  const initialState = {
    auth: {
      tenantToken: 'old-token',
      tenantId: 'tenant-123',
      user: { id: 1, name: 'Test' },
      isAuthenticated: true
    }
  };
  
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: initialState
  });
  
  // Mock API response
  api.post.mockResolvedValueOnce({
    data: { token: 'new-token' }
  });
  
  await store.dispatch(refreshToken());
  
  const state = store.getState();
  expect(state.auth.tenantToken).toBe('new-token');
  expect(state.auth.user).toEqual({ id: 1, name: 'Test' }); // User unchanged
  expect(state.auth.isAuthenticated).toBe(true);
});
```

### 3. Token Refresh Failure
```javascript
it('should clear auth state on refresh failure', async () => {
  const initialState = {
    auth: {
      tenantToken: 'expired-token',
      tenantId: 'tenant-123',
      user: { id: 1, name: 'Test' },
      isAuthenticated: true
    }
  };
  
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: initialState
  });
  
  // Mock API error
  api.post.mockRejectedValueOnce(new Error('Token expired'));
  
  await store.dispatch(refreshToken());
  
  const state = store.getState();
  expect(state.auth.tenantToken).toBeNull();
  expect(state.auth.user).toBeNull();
  expect(state.auth.isAuthenticated).toBe(false);
});
```

---

## Test File Location

Likely in one of these files:
- `client/hr-app/src/store/slices/__tests__/authSlice.test.js`
- `client/hr-app/src/store/__tests__/authSlice.test.js`
- `client/hr-app/src/__tests__/store/authSlice.test.js`

Search for: `localStorage.setItem.*tenant_token`

---

## Quick Fix Command

```bash
# Find the test file
grep -r "localStorage.setItem.*tenant_token" client/hr-app/src --include="*.test.js" --include="*.spec.js"

# Then edit the file and update the assertions
```

---

## Verification

After updating the test:

```bash
# Run just the auth tests
npm test -- authSlice

# Or run all store tests
npm test -- store

# Should see: 0 fail / 104 pass / 104 total
```

---

**Estimated Time:** 5-10 minutes  
**Priority:** Medium (test is wrong, not the code)  
**Blocker:** No (can deploy with this test failing)
