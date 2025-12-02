# Chrome Login Debugging Guide

## Step 1: Check Browser Console

1. Open Chrome DevTools: Press `F12` or `Ctrl+Shift+I`
2. Go to **Console** tab
3. Try to login
4. Look for any red error messages

## Step 2: Check Network Requests

1. In DevTools, go to **Network** tab
2. Try to login
3. Look for the `/api/users/login` request
4. Click on it and check:
   - **Status**: Should be 200 (success) or 401 (wrong credentials)
   - **Response**: What error message is returned?
   - **Headers**: Check if CORS headers are present

## Step 3: Check Local Storage

1. In DevTools, go to **Application** tab
2. Expand **Local Storage** in left sidebar
3. Click on your site URL
4. After login attempt, check if `token` and `user` are saved

## Step 4: Common Fixes

### Fix 1: Clear Browser Data

1. Press `Ctrl+Shift+Delete`
2. Select "Cookies and other site data" and "Cached images and files"
3. Click "Clear data"
4. Try login again

### Fix 2: Disable Extensions

1. Open Incognito mode: `Ctrl+Shift+N`
2. Try login there (extensions are disabled by default)
3. If it works, one of your extensions is blocking it

### Fix 3: Check Cookie Settings

1. Go to `chrome://settings/cookies`
2. Make sure cookies are not blocked
3. Add your localhost to allowed sites if needed

### Fix 4: Check CORS on Server

Make sure your server has CORS enabled. Check `server/index.js` or `server/app.js` for:

```javascript
app.use(
  cors({
    origin: "http://localhost:3000", // Your frontend URL
    credentials: true,
  })
);
```

## Step 5: Test API Directly

Open a new tab and try to access:

- `http://localhost:5000/api/users` (should return users list or 401)

If this doesn't work, your backend server might not be running.

## Step 6: Check Server Logs

Look at your server terminal/console for any error messages when you try to login.

## Common Error Messages and Solutions

### "Network Error"

- Backend server is not running
- Wrong API URL in `.env` file
- Firewall blocking the connection

### "CORS Error"

- Server needs CORS middleware configured
- Check `Access-Control-Allow-Origin` header

### "401 Unauthorized"

- Wrong email/password
- Check database for user credentials

### "Cannot read property 'token' of undefined"

- Server response format is wrong
- Check server is returning `{ user, token }` format

### Nothing happens / No error

- Check if JavaScript is enabled
- Check if form submission is being prevented
- Look for console errors
