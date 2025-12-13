# Build Configuration Guide

This document describes the multi-app build configuration for the HRMS platform, which consists of two separate React applications: HR-App (tenant application) and Platform-Admin (system administration).

## Architecture Overview

```
client/
├── hr-app/              # Tenant application (port 3000)
├── platform-admin/      # Platform admin application (port 3001)
├── shared/              # Shared components and utilities
└── package.json         # Root workspace configuration
```

## Development Servers

### Starting Individual Applications

**HR-App (Tenant Application)**
```bash
npm run start:hr
# Runs on http://localhost:3000
```

**Platform-Admin (System Administration)**
```bash
npm run start:platform
# Runs on http://localhost:3001
```

### Starting Both Applications Concurrently

```bash
npm run start:both
# or
npm run dev
```

This starts both applications simultaneously with color-coded console output:
- HR-APP (cyan)
- PLATFORM (magenta)

### Port Configuration

Ports are configured in the `.env` files:
- **hr-app**: PORT=3000
- **platform-admin**: PORT=3001

Both applications have `BROWSER=none` to prevent auto-opening browsers.

## Build Scripts

### Development Builds

```bash
# Build HR-App only
npm run build:hr

# Build Platform-Admin only
npm run build:platform

# Build both applications
npm run build:all
```

### Production Builds

```bash
# Build both apps with production optimizations
npm run build:production
```

Production builds include:
- Code splitting and chunk optimization
- Vendor bundle separation
- Shared component bundle
- Minification and tree-shaking
- Source maps for debugging

### Build Output

**HR-App**
- Output directory: `client/hr-app/build/`
- Public path: `/hr-app/`

**Platform-Admin**
- Output directory: `client/platform-admin/build/`
- Public path: `/platform-admin/`

## Testing

### Running Tests

```bash
# Test HR-App only
npm run test:hr

# Test Platform-Admin only
npm run test:platform

# Test both applications
npm run test:all
```

Tests run in non-watch mode by default (using `--run` flag).

## Linting

### Running Linters

```bash
# Lint HR-App
npm run lint:hr

# Lint Platform-Admin
npm run lint:platform

# Lint both applications
npm run lint:all
```

### Auto-fix Linting Issues

```bash
# In hr-app directory
cd hr-app && npm run lint:fix

# In platform-admin directory
cd platform-admin && npm run lint:fix
```

## Cleaning Build Artifacts

```bash
# Clean both applications
npm run clean

# Clean HR-App only
npm run clean:hr

# Clean Platform-Admin only
npm run clean:platform
```

This removes:
- Build directories
- Webpack cache
- Node modules cache

## Webpack Configuration (via CRACO)

Both applications use CRACO (Create React App Configuration Override) for custom webpack configuration.

### Key Features

**1. Module Resolution**
- Alias for shared components: `@shared`
- ESM resolution for date-fns compatibility

**2. Code Splitting**
- Vendor bundle: All node_modules dependencies
- Shared bundle: Components from `../shared`
- Automatic chunk splitting for optimal loading

**3. Development Server**
- Hot module replacement (HMR)
- History API fallback for client-side routing
- Separate ports for each application
- No auto-browser opening

**4. Jest Configuration**
- ES module transformation for fast-check, axios, react-router-dom
- Module name mapping for `@shared` imports

## Shared Components

The `shared/` directory contains reusable components and utilities:

```
shared/
├── ui-kit/          # Reusable UI components (Button, Modal, etc.)
├── utils/           # Utility functions
└── constants/       # Shared constants
```

### Using Shared Components

```javascript
// In hr-app or platform-admin
import { Button } from '@shared/ui-kit/Button';
import { formatDate } from '@shared/utils/formatters';
```

## Environment Variables

### HR-App (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
PORT=3000
BROWSER=none
```

### Platform-Admin (.env)
```
REACT_APP_API_URL=http://localhost:5000/api/platform
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
PORT=3001
BROWSER=none
```

## Workspace Configuration

The root `package.json` uses npm workspaces to manage dependencies:

```json
"workspaces": [
  "hr-app",
  "platform-admin",
  "shared"
]
```

### Cross-Platform Compatibility

The build scripts use cross-platform tools:
- **cross-env**: Sets environment variables on all platforms
- **rimraf**: Cross-platform file deletion
- **concurrently**: Runs multiple commands simultaneously

This ensures the build process works identically on Windows, macOS, and Linux.

### Installing Dependencies

```bash
# Install all dependencies for all workspaces
npm run install:all

# Install in specific workspace
cd hr-app && npm install <package>
cd platform-admin && npm install <package>
```

## Deployment

### Development Deployment

1. Start the backend server:
   ```bash
   npm run server
   ```

2. Start both frontend applications:
   ```bash
   cd client && npm run dev
   ```

3. Access applications:
   - HR-App: http://localhost:3000
   - Platform-Admin: http://localhost:3001
   - Backend API: http://localhost:5000

### Production Deployment

1. Build both applications:
   ```bash
   cd client && npm run build:production
   ```

2. Serve static files:
   - HR-App: Serve `client/hr-app/build/` at `/hr-app/`
   - Platform-Admin: Serve `client/platform-admin/build/` at `/platform-admin/`

3. Configure reverse proxy (nginx example):
   ```nginx
   location /hr-app/ {
       alias /path/to/client/hr-app/build/;
       try_files $uri $uri/ /hr-app/index.html;
   }
   
   location /platform-admin/ {
       alias /path/to/client/platform-admin/build/;
       try_files $uri $uri/ /platform-admin/index.html;
   }
   
   location /api/ {
       proxy_pass http://localhost:5000/api/;
   }
   ```

## Troubleshooting

### Port Already in Use

If ports 3000 or 3001 are already in use, update the PORT in the respective `.env` file.

### Module Resolution Issues

If shared components aren't resolving:
1. Ensure the `@shared` alias is configured in `craco.config.js`
2. Restart the development server
3. Clear webpack cache: `npm run clean`

### Build Failures

1. Clear all caches: `npm run clean`
2. Reinstall dependencies: `npm run install:all`
3. Try building individually to isolate the issue

### Hot Reload Not Working

1. Ensure `hot: true` is set in `devServer` config
2. Check that files are being watched (not in node_modules)
3. Restart the development server

## Performance Optimization

### Development
- Hot module replacement for fast updates
- Separate dev servers prevent port conflicts
- Shared component caching

### Production
- Code splitting reduces initial bundle size
- Vendor bundle caching improves repeat visits
- Tree-shaking removes unused code
- Minification reduces file sizes

## CI/CD Integration

### Example GitHub Actions Workflow

```yaml
name: Build Frontend

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd client && npm run install:all
      - name: Lint
        run: cd client && npm run lint:all
      - name: Test
        run: cd client && npm run test:all
      - name: Build
        run: cd client && npm run build:production
```

## Summary

This multi-app build configuration provides:
- ✅ Separate development servers with different ports
- ✅ Concurrent development mode for both apps
- ✅ Optimized production builds with code splitting
- ✅ Shared component library
- ✅ Independent testing and linting
- ✅ Clean separation of concerns
- ✅ Easy deployment workflow

For questions or issues, refer to the individual app documentation or the main project README.
