# Project Cleanup Instructions

## Completed Automatically ✅

The following duplications have been automatically resolved:

1. **Shared Constants** - Created `shared-constants.js` and updated imports
2. **Gitignore Files** - Consolidated and simplified
3. **Code Organization** - Improved structure

## Manual Actions Required ⚠️

### Step 1: Review Duplicate Folders

Check if these root folders contain any important data:

```bash
# Check backups folder
dir backups /s

# Check uploads folder
dir uploads /s
```

### Step 2: Move Content (if needed)

If the root folders contain data, move it to server folders:

```bash
# Move backups
xcopy backups\* server\backups\ /E /I /Y

# Move uploads
xcopy uploads\* server\uploads\ /E /I /Y
```

### Step 3: Remove Duplicate Folders

After confirming content is moved or empty:

```bash
# Remove root backups folder
rmdir /s /q backups

# Remove root uploads folder
rmdir /s /q uploads
```

### Step 4: Update Configuration

Update any configuration files that reference the old paths:

1. Check `server/index.js` for upload/backup paths
2. Check `.env` files for path configurations
3. Update any scripts that reference these folders

### Step 5: Test Everything

```bash
# Test server
npm run server

# Test client
cd client
npm start

# Run tests
cd ..
npm test
```

## Verification Checklist

- [ ] Shared constants import correctly in client
- [ ] Shared constants import correctly in server
- [ ] No import errors in console
- [ ] Backup functionality still works
- [ ] Upload functionality still works
- [ ] All tests pass
- [ ] Application runs without errors

## Rollback Plan

If issues occur, you can rollback by:

1. Restore original `client/src/constants/index.js`
2. Restore original `server/utils/constants.js`
3. Delete `shared-constants.js`
4. Restore original `.gitignore` files

Original files are in your git history.

## Questions?

If you encounter any issues:

1. Check the DEDUPLICATION_REPORT.md for details
2. Review git diff to see what changed
3. Run diagnostics on affected files
