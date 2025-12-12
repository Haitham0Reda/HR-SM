# Quick Start Guide

Get up and running with the HRMS frontend applications in minutes.

## Prerequisites

- Node.js 18+ installed
- npm 8+ installed
- Backend server running on port 5000

## Installation

```bash
# From the client directory
npm run install:all
```

This installs dependencies for:
- Root workspace
- HR-App
- Platform-Admin
- Shared components

## Development

### Start Both Applications

```bash
npm run dev
```

This starts:
- **HR-App** on http://localhost:3000
- **Platform-Admin** on http://localhost:3001

### Start Individual Applications

```bash
# HR-App only
npm run start:hr

# Platform-Admin only
npm run start:platform
```

## Building

### Development Build

```bash
# Build both apps
npm run build:all

# Build individually
npm run build:hr
npm run build:platform
```

### Production Build

```bash
npm run build:production
```

## Testing

```bash
# Test both apps
npm run test:all

# Test individually
npm run test:hr
npm run test:platform
```

## Linting

```bash
# Lint both apps
npm run lint:all

# Lint individually
npm run lint:hr
npm run lint:platform
```

## Cleaning

```bash
# Clean build artifacts and caches
npm run clean
```

## Application URLs

### Development
- HR-App: http://localhost:3000
- Platform-Admin: http://localhost:3001
- Backend API: http://localhost:5000

### Production (Example)
- HR-App: https://your-domain.com/hr-app/
- Platform-Admin: https://your-domain.com/platform-admin/
- Backend API: https://your-domain.com/api/

## Default Credentials

### HR-App (Tenant Users)
Check with your system administrator for tenant-specific credentials.

### Platform-Admin (System Administrators)
Check with your system administrator for platform admin credentials.

## Common Tasks

### Adding a New Dependency

```bash
# For HR-App
cd hr-app
npm install <package-name>

# For Platform-Admin
cd platform-admin
npm install <package-name>

# For Shared Components
cd shared
npm install <package-name>
```

### Using Shared Components

```javascript
// In hr-app or platform-admin
import { Button } from '@shared/ui-kit/Button';
import { formatDate } from '@shared/utils/formatters';
```

### Changing Ports

Edit the `.env` file in the respective app directory:

```
# hr-app/.env
PORT=3000

# platform-admin/.env
PORT=3001
```

### Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in .env file
```

**Module not found:**
```bash
# Reinstall dependencies
npm run install:all
```

**Build errors:**
```bash
# Clean and rebuild
npm run clean
npm run build:all
```

**Hot reload not working:**
```bash
# Restart dev server
# Press Ctrl+C to stop
npm run dev
```

## Project Structure

```
client/
├── hr-app/              # Tenant application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── services/
│   └── package.json
├── platform-admin/      # Platform admin application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── services/
│   └── package.json
├── shared/              # Shared components
│   ├── ui-kit/
│   ├── utils/
│   └── constants/
└── package.json         # Root workspace
```

## Next Steps

- Read [BUILD_CONFIGURATION.md](./BUILD_CONFIGURATION.md) for detailed build configuration
- Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment instructions
- Check individual app READMEs for app-specific documentation

## Getting Help

- Check the [main README](../README.md)
- Review the [documentation](../docs/)
- Check browser console for errors
- Review server logs

## Useful Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both apps in development mode |
| `npm run build:all` | Build both apps |
| `npm run build:production` | Build both apps for production |
| `npm run test:all` | Run tests for both apps |
| `npm run lint:all` | Lint both apps |
| `npm run clean` | Clean build artifacts |
| `npm run install:all` | Install all dependencies |

---

**Happy coding! 🚀**
