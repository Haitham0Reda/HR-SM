# Quick Start Guide - Post Migration

## 🚀 Getting Started

Now that the migration is complete, here's how to test and use the new License Server setup.

---

## Step 1: Start the License Server

```bash
cd hrsm-license-server
npm start
```

**Expected Output:**
```
License Server running on port 4000
Connected to MongoDB: hrsm-licenses
```

---

## Step 2: Test the License Server API

### Test 1: Get Tenant Information

```bash
curl -H "X-API-Key: hrsm-admin-key-2024-secure-change-in-production" http://localhost:4000/api/tenants/techcorp_solutions
```

**Expected Response:**
```json
{
  "tenantId": "techcorp_solutions",
  "name": "Demo Tenant",
  "status": "active",
  "enabledModules": ["hr-core"],
  "subscription": {
    "status": "trial",
    "planId": null
  }
}
```

### Test 2: List All Tenants

```bash
curl -H "X-API-Key: hrsm-admin-key-2024-secure-change-in-production" http://localhost:4000/api/tenants
```

### Test 3: Get Enabled Modules

```bash
curl -H "X-API-Key: hrsm-admin-key-2024-secure-change-in-production" http://localhost:4000/api/tenants/techcorp_solutions/modules
```

**Expected Response:**
```json
{
  "tenantId": "techcorp_solutions",
  "enabledModules": ["hr-core"]
}
```

---

## Step 3: Test the Main Application

### Start the Main Application

```bash
# In the root directory
npm start
```

The application should still work normally using the local tenant data (backward compatibility).

---

## Step 4: Enable License Server Integration (Optional)

To make the main application use the License Server:

### Update .env

```env
# Enable License Server validation
LICENSE_VALIDATION_ENABLED=true

# License Server URL (should already be set)
LICENSE_SERVER_URL=http://localhost:4000

# License Server API Key (should already be set)
LICENSE_SERVER_API_KEY=hrsm_dev_backend_key_1234567890123456789012345678901234567890123
```

### Restart the Application

```bash
npm restart
```

---

## Step 5: Verify Integration

### Test User Login

1. Open browser: `http://localhost:3000`
2. Login with a user from `techcorp_solutions` tenant
3. Verify you can access the application

### Check Logs

Look for these log messages:
- ✅ "Using License Server API" - Good! Using new system
- ⚠️ "Using local database" - Still using old system (backward compatibility)

---

## Troubleshooting

### License Server Not Starting

**Problem:** Port 4000 already in use

**Solution:**
```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### API Returns 401 Unauthorized

**Problem:** Invalid API key

**Solution:** Check that the API key in the main app's `.env` matches the License Server's allowed keys:
- Main app: `LICENSE_SERVER_API_KEY`
- License Server: `ADMIN_API_KEY`

### Cannot Connect to Database

**Problem:** License Server can't connect to MongoDB

**Solution:** Verify the connection string in `hrsm-license-server/.env`:
```env
MONGODB_URI=mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@license-server.n0m3jbn.mongodb.net/hrsm-licenses?retryWrites=true&w=majority
```

---

## MongoDB Compass - View Migrated Data

### Connect to License Server Cluster

1. Open MongoDB Compass
2. Click "New Connection"
3. Enter connection string:
   ```
   mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@license-server.n0m3jbn.mongodb.net/
   ```
4. Click "Connect"
5. Navigate to `hrsm-licenses` database
6. View the `tenants` collection

---

## Testing Checklist

- [ ] License Server starts successfully
- [ ] Can retrieve tenant via API
- [ ] Can list all tenants via API
- [ ] Can get enabled modules via API
- [ ] Main application still works
- [ ] User can login
- [ ] User can access enabled modules
- [ ] Logs show correct data source

---

## Next Steps

### When Everything Works

1. **Monitor for a few days** - Ensure stability
2. **Test all features** - Verify nothing is broken
3. **Enable License Server exclusively** - Set `LICENSE_VALIDATION_ENABLED=true`
4. **Disable backward compatibility** - Remove old tenant data from `hrsm_platform`

### If Issues Arise

1. **Check logs** - Look for error messages
2. **Verify API keys** - Ensure they match
3. **Test API directly** - Use curl to isolate issues
4. **Rollback if needed** - Use the backup created during migration

---

## Useful Commands

### Check License Server Status
```bash
curl http://localhost:4000/health
```

### View License Server Logs
```bash
# If using PM2
pm2 logs license-server

# If running directly
# Check console output
```

### Test Database Connection
```bash
node --input-type=module -e "import { MongoClient } from 'mongodb'; const uri = 'mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@license-server.n0m3jbn.mongodb.net/hrsm-licenses'; const client = new MongoClient(uri); await client.connect(); console.log('✓ Connected'); const count = await client.db('hrsm-licenses').collection('tenants').countDocuments(); console.log('Tenants:', count); await client.close();"
```

---

## Support

If you encounter any issues:

1. Check the troubleshooting guide: `docs/platform/PLATFORM_DATA_MIGRATION_TROUBLESHOOTING.md`
2. Review the migration summary: `MIGRATION_COMPLETE_SUMMARY.md`
3. Check the API documentation: `docs/platform/LICENSE_SERVER_API_DOCUMENTATION.md`

---

**Happy Testing! 🎉**
