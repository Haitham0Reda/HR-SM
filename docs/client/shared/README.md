# Shared Components and Utilities

This directory contains shared code used by both `hr-app` and `platform-admin`.

## Structure

```
shared/
├── ui-kit/          # Reusable UI components
├── utils/           # Utility functions
├── constants/       # Shared constants
└── index.js         # Main export file
```

## UI Kit

Standardized UI components built on top of Material-UI:

- **Button**: Consistent button styling with loading states
- **TextField**: Standardized text input with validation
- **Modal**: Dialog component with consistent styling
- **DataTable**: Table with sorting, pagination, and filtering

### Usage

```javascript
import { Button, TextField, Modal, DataTable } from '@hrms/shared';

// Use components with optional design tokens
<Button loading={isLoading} onClick={handleClick}>
  Save Changes
</Button>
```

### Design Tokens

Components accept optional `designTokens` prop for theming:

```javascript
const customTokens = {
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
  typography: { fontSize: { sm: '0.875rem', md: '1rem', lg: '1.125rem' } },
  borderRadius: { md: '8px', lg: '12px' },
  shadows: { sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }
};

<Button designTokens={customTokens}>Click Me</Button>
```

## Utilities

Common utility functions:

### Formatters
- `formatDate(date, locale)` - Format dates
- `formatDateTime(date, locale)` - Format date and time
- `formatCurrency(amount, currency, locale)` - Format currency
- `formatFileSize(bytes)` - Format file sizes
- `truncateText(text, maxLength)` - Truncate text with ellipsis
- `getRelativeTime(date)` - Get relative time (e.g., "2 hours ago")

### Helpers
- `generateId()` - Generate unique IDs
- `deepClone(obj)` - Deep clone objects
- `debounce(func, wait)` - Debounce functions
- `throttle(func, limit)` - Throttle functions
- `sortByKey(array, key, order)` - Sort arrays
- `groupBy(array, key)` - Group arrays
- `getNestedValue(obj, path, defaultValue)` - Safely access nested values
- `copyToClipboard(text)` - Copy to clipboard
- `sleep(ms)` - Async delay

### Usage

```javascript
import { formatDate, debounce, generateId } from '@hrms/shared';

const formattedDate = formatDate(new Date());
const debouncedSearch = debounce(searchFunction, 300);
const uniqueId = generateId();
```

## Constants

Shared constants for both applications:

- **API_BASE_URL**: Base API URL
- **PLATFORM_API_BASE**: Platform API namespace (`/api/platform`)
- **TENANT_API_BASE**: Tenant API namespace (`/api/v1`)
- **STATUS_COLORS**: Status color mappings
- **PLATFORM_ROLES**: Platform user roles
- **TENANT_ROLES**: Tenant user roles
- **HTTP_STATUS**: HTTP status codes
- **ERROR_MESSAGES**: Standard error messages
- **SUCCESS_MESSAGES**: Standard success messages

### Usage

```javascript
import { TENANT_API_BASE, STATUS_COLORS, TENANT_ROLES } from '@hrms/shared';

const apiUrl = `${TENANT_API_BASE}/users`;
const statusColor = STATUS_COLORS.active;
const isAdmin = user.role === TENANT_ROLES.ADMIN;
```

## Installation

The shared package is automatically linked via npm workspaces. To use in an app:

```json
{
  "dependencies": {
    "@hrms/shared": "*"
  }
}
```

Then import:

```javascript
import { Button, formatDate, TENANT_ROLES } from '@hrms/shared';
```

## Development

When adding new shared code:

1. Add to appropriate directory (`ui-kit/`, `utils/`, or `constants/`)
2. Export from the directory's `index.js`
3. Ensure it's exported from the main `shared/index.js`
4. Update this README with usage examples

## Guidelines

- Keep components generic and reusable
- Avoid app-specific logic
- Document all exports with JSDoc comments
- Include PropTypes for React components
- Write unit tests for utilities
