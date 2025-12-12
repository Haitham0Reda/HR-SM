# DEPRECATED - Legacy Config Directory

⚠️ **This directory is deprecated and maintained only for backward compatibility.**

## New Location

Configuration files have been moved to:
- **Core Config**: `server/core/config/`

This includes:
- Database configuration
- Environment configuration
- Redis configuration

## Module Registry

Module registry and configuration has been moved to:
- **Module Registry**: `server/core/registry/`

## Migration Guide

When updating imports, change from:
```javascript
import config from '../config/database.js';
```

To:
```javascript
import config from '../core/config/database.js';
```

## Removal Timeline

This directory will be removed in a future release once all references have been updated.
