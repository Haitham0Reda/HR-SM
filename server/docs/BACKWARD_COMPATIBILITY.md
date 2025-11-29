# Backward Compatibility Features

## Overview

This document describes the backward compatibility features implemented for the leave system refactoring. These features ensure a smooth transition from the legacy monolithic Leave API to the new specialized endpoints.

## Feature Flags

### Configuration File

Feature flags are defined in `server/config/features.config.js`:

```javascript
export const FEATURES = {
    ENABLE_LEGACY_LEAVE: true,           // Enable legacy /api/leaves endpoints
    ENABLE_NEW_LEAVE_MODELS: true,       // Enable new specialized endpoints
    LOG_LEGACY_USAGE: true,              // Log legacy endpoint usage
    SEND_DEPRECATION_HEADERS: true       // Add deprecation headers
};
```

### Environment Variables

Control features via environment variables:

```bash
# .env file
ENABLE_LEGACY_LEAVE=true
ENABLE_NEW_LEAVE_MODELS=true
LOG_LEGACY_USAGE=true
SEND_DEPRECATION_HEADERS=true
LEGACY_DEPRECATION_DATE=2025-12-01
LEGACY_SUNSET_DATE=2026-06-01
```

## Deprecation Middleware

### Location

`server/middleware/deprecation.middleware.js`

### Features

1. **Deprecation Headers:** Adds HTTP headers to legacy responses
2. **Usage Logging:** Tracks who is using legacy endpoints
3. **Legacy Check:** Returns HTTP 410 Gone when legacy is disabled

### Usage

```javascript
import { deprecateEndpoint, checkLegacyEnabled } from '../middleware/deprecation.middleware.js';

// Apply to routes
router.use(checkLegacyEnabled);
router.use(deprecateEndpoint({ endpoint: '/api/leaves' }));
```

## Deprecation Headers

Legacy endpoints return these headers:

```
X-Deprecated: true
X-Deprecation-Date: 2025-12-01
X-Sunset: 2026-06-01
X-Replacement: /api/missions, /api/sick-leaves, /api/permissions, /api/overtime, /api/vacations
Warning: 299 - "Deprecated API: /api/leaves will be removed on 2026-06-01..."
```

## Legacy Endpoint Logging

### Log Format

```json
{
  "level": "warn",
  "message": "Legacy endpoint accessed",
  "category": "LEGACY_API_USAGE",
  "endpoint": "/api/leaves",
  "method": "POST",
  "userId": "507f1f77bcf86cd799439011",
  "userRole": "employee",
  "leaveType": "mission",
  "timestamp": "2025-11-29T10:30:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "ip": "192.168.1.100"
}
```

### Monitoring

Query logs to track migration progress:

```bash
# Count legacy API usage
grep "LEGACY_API_USAGE" logs/*.log | wc -l

# Group by leave type
grep "LEGACY_API_USAGE" logs/*.log | grep -o '"leaveType":"[^"]*"' | sort | uniq -c

# Find users still using legacy API
grep "LEGACY_API_USAGE" logs/*.log | grep -o '"userId":"[^"]*"' | sort | uniq
```

## Deprecation Timeline

| Date | Action |
|------|--------|
| **2025-12-01** | Deprecation announced, warnings added |
| **2026-01-01** | Active migration period begins |
| **2026-03-01** | Migration deadline |
| **2026-06-01** | Legacy endpoints removed (HTTP 410 Gone) |

## Endpoint Mapping

| Legacy | New Endpoint | Leave Type |
|--------|--------------|------------|
| `/api/leaves` | `/api/missions` | `mission` |
| `/api/leaves` | `/api/sick-leaves` | `sick` |
| `/api/leaves` | `/api/permissions` | `late-arrival`, `early-departure` |
| `/api/leaves` | `/api/overtime` | `overtime` |
| `/api/leaves` | `/api/vacations` | `annual`, `casual`, `unpaid` |

## Disabling Legacy Endpoints

To disable legacy endpoints:

```bash
# In .env
ENABLE_LEGACY_LEAVE=false
```

This returns HTTP 410 Gone:

```json
{
  "error": "This endpoint has been removed",
  "message": "The legacy leave endpoint has been sunset as of 2026-06-01",
  "replacement": "/api/missions, /api/sick-leaves, /api/permissions, /api/overtime, /api/vacations",
  "documentation": "/api/docs/leave-migration"
}
```

## Testing Backward Compatibility

### Test Legacy Endpoint with Warnings

```bash
curl -i http://localhost:5000/api/leaves \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected headers:
```
X-Deprecated: true
X-Deprecation-Date: 2025-12-01
X-Sunset: 2026-06-01
X-Replacement: /api/missions, /api/sick-leaves, ...
Warning: 299 - "Deprecated API..."
```

### Test Legacy Disabled

```bash
# Set in .env
ENABLE_LEGACY_LEAVE=false

# Request returns 410 Gone
curl -i http://localhost:5000/api/leaves \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test New Endpoints

```bash
# Mission
curl -X POST http://localhost:5000/api/missions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location": "NYC", "purpose": "Meeting", ...}'

# Sick Leave
curl -X POST http://localhost:5000/api/sick-leaves \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2025-12-01", "reason": "Flu", ...}'
```

## Client-Side Detection

### JavaScript Example

```javascript
async function fetchLeaves() {
  const response = await fetch('/api/leaves', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  // Check for deprecation
  if (response.headers.get('X-Deprecated') === 'true') {
    const replacement = response.headers.get('X-Replacement');
    const sunset = response.headers.get('X-Sunset');
    
    console.warn(`API Deprecated! Will be removed on ${sunset}`);
    console.warn(`Use instead: ${replacement}`);
    
    // Show user notification
    showDeprecationNotice(replacement, sunset);
  }
  
  return response.json();
}
```

### React Example

```javascript
import { useEffect } from 'react';

function LeaveList() {
  useEffect(() => {
    fetch('/api/leaves', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
      if (response.headers.get('X-Deprecated') === 'true') {
        // Show deprecation banner
        setShowDeprecationBanner(true);
      }
      return response.json();
    });
  }, []);
  
  return (
    <>
      {showDeprecationBanner && <DeprecationBanner />}
      {/* ... */}
    </>
  );
}
```

## Migration Checklist

- [ ] Review feature flags configuration
- [ ] Enable deprecation headers
- [ ] Enable legacy usage logging
- [ ] Monitor logs for legacy API usage
- [ ] Identify clients using legacy endpoints
- [ ] Update clients to use new endpoints
- [ ] Test new endpoints thoroughly
- [ ] Disable legacy endpoints after migration
- [ ] Remove legacy code after sunset date

## Rollback Procedure

If issues arise:

1. **Re-enable legacy endpoints:**
   ```bash
   ENABLE_LEGACY_LEAVE=true
   ```

2. **Disable new endpoints (if needed):**
   ```bash
   ENABLE_NEW_LEAVE_MODELS=false
   ```

3. **Restart server:**
   ```bash
   npm restart
   ```

4. **Investigate and fix issues**

5. **Resume migration when ready**

## Related Documentation

- **Full Migration Guide:** `server/docs/LEAVE_SYSTEM_DEPRECATION.md`
- **API Documentation:** See individual endpoint documentation
- **Migration Scripts:** `server/scripts/migrations/`
- **Feature Spec:** `.kiro/specs/leave-system-refactor/`

## Support

For questions or issues:
- Review the full deprecation guide
- Check server logs for errors
- Contact the development team
- Open an issue in the project repository

---

**Last Updated:** November 29, 2025  
**Status:** Implementation Complete  
**Next Action:** Monitor legacy usage and plan deprecation announcement
