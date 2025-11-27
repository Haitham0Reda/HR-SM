# Loading and Error States - Implementation Guide

This document describes the loading and error state implementations for the role management UI.

## Components Created

### 1. RolesTableSkeleton
**Location:** `client/src/components/roles/RolesTableSkeleton.jsx`

Skeleton loader for the roles list page. Shows placeholder content while roles are being fetched.

**Usage:**
```jsx
import RolesTableSkeleton from '../../components/roles/RolesTableSkeleton';

if (loading) {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 4 }}>
            <RolesTableSkeleton rows={5} />
        </Box>
    );
}
```

**Props:**
- `rows` (number, default: 5) - Number of skeleton rows to display

### 2. RoleFormSkeleton
**Location:** `client/src/components/roles/RoleFormSkeleton.jsx`

Skeleton loader for role create/edit form pages.

**Usage:**
```jsx
import RoleFormSkeleton from '../../components/roles/RoleFormSkeleton';

if (loading) {
    return <RoleFormSkeleton />;
}
```

### 3. RoleViewSkeleton
**Location:** `client/src/components/roles/RoleViewSkeleton.jsx`

Skeleton loader for role details view page.

**Usage:**
```jsx
import RoleViewSkeleton from '../../components/roles/RoleViewSkeleton';

if (loading) {
    return <RoleViewSkeleton />;
}
```

## Utilities Created

### 1. Retry Request Utility
**Location:** `client/src/utils/retryRequest.js`

Provides automatic retry mechanism for failed API calls with exponential backoff.

**Usage:**
```jsx
import { retryRequest, withRetry } from '../utils/retryRequest';

// Option 1: Wrap individual requests
const fetchData = async () => {
    return retryRequest(
        () => api.get('/endpoint'),
        {
            maxRetries: 3,
            initialDelay: 1000,
            onRetry: (attempt, maxRetries, delay, error) => {
                console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
            }
        }
    );
};

// Option 2: Create retryable service methods
const getAll = withRetry(
    async (params) => api.get('/roles', { params }),
    { maxRetries: 2 }
);
```

**Options:**
- `maxRetries` (number, default: 3) - Maximum retry attempts
- `initialDelay` (number, default: 1000) - Initial delay in milliseconds
- `maxDelay` (number, default: 10000) - Maximum delay between retries
- `shouldRetry` (function) - Custom function to determine if error should be retried
- `onRetry` (function) - Callback before each retry attempt

**Default Retry Behavior:**
- Retries on network errors (no response)
- Retries on 5xx server errors
- Retries on 408 Request Timeout
- Retries on 429 Too Many Requests
- Does NOT retry on 4xx client errors (except 408 and 429)

### 2. Form Validation Hook
**Location:** `client/src/hooks/useFormValidation.js`

Custom hook for managing form validation state and inline error messages.

**Usage:**
```jsx
import useFormValidation from '../../hooks/useFormValidation';

const MyForm = () => {
    const { 
        errors, 
        setError, 
        clearError, 
        hasError, 
        getError,
        setApiErrors,
        clearAllErrors 
    } = useFormValidation();

    const handleSubmit = async () => {
        try {
            // Clear previous errors
            clearAllErrors();
            
            // Validate fields
            if (!name) {
                setError('name', 'Name is required');
                return;
            }
            
            // Submit form
            await api.post('/endpoint', data);
        } catch (error) {
            // Set errors from API response
            setApiErrors(error);
        }
    };

    return (
        <TextField
            name="name"
            error={hasError('name')}
            helperText={getError('name')}
            onChange={() => clearError('name')}
        />
    );
};
```

**Methods:**
- `setError(field, message)` - Set error for a field
- `setErrors(errorObj)` - Set multiple errors
- `clearError(field)` - Clear error for a field
- `clearAllErrors()` - Clear all errors
- `hasError(field)` - Check if field has error
- `getError(field)` - Get error message for field
- `hasAnyError()` - Check if any errors exist
- `validateField(field, value, validator)` - Validate with custom function
- `setApiErrors(error)` - Parse and set errors from API response

## Enhanced Components

### 1. ConfirmDialog (Updated)
**Location:** `client/src/components/common/ConfirmDialog.jsx`

Added loading state support for async operations.

**New Props:**
- `loading` (boolean, default: false) - Shows spinner and disables buttons during operation

**Usage:**
```jsx
const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
    setDeleting(true);
    try {
        await roleService.delete(id);
    } finally {
        setDeleting(false);
    }
};

<ConfirmDialog
    open={open}
    title="Delete Role"
    message="Are you sure?"
    onConfirm={handleDelete}
    onCancel={handleCancel}
    loading={deleting}
/>
```

### 2. ErrorBoundary
**Location:** `client/src/components/common/ErrorBoundary.jsx`

Catches JavaScript errors in component tree and displays fallback UI.

**Usage:**
```jsx
import { ErrorBoundary } from '../../components/common';

<ErrorBoundary>
    <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches and logs errors
- Shows user-friendly error message
- Displays error details in development mode
- Provides "Try Again" and "Reload Page" buttons

## Service Updates

### Role Service (Updated)
**Location:** `client/src/services/role.service.js`

All read operations now include automatic retry logic:
- `getAll()` - Retries up to 2 times
- `getById()` - Retries up to 2 times
- `getStats()` - Retries up to 2 times
- `getAllPermissions()` - Retries up to 2 times

Write operations (create, update, delete) do NOT retry to prevent duplicate operations.

## Implementation Checklist

### For RolesPage (List View) ✅
- [x] Skeleton loader for initial page load
- [x] Loading state for delete operations
- [x] Error toast notifications for failed operations
- [x] Retry mechanism for API calls
- [x] Proper error message handling

### For RoleEditPage (Create/Edit Form)
- [ ] Use RoleFormSkeleton for initial load
- [ ] Use LoadingButton for form submission
- [ ] Use useFormValidation hook for inline errors
- [ ] Show error toast for failed submissions
- [ ] Disable form during submission
- [ ] Clear errors on field change

### For RoleViewPage (Details View)
- [ ] Use RoleViewSkeleton for initial load
- [ ] Loading state for delete operation
- [ ] Error toast for failed operations
- [ ] Retry mechanism for fetching role details

## Best Practices

### 1. Loading States
- Always show skeleton loaders for initial page loads (better UX than spinners)
- Use LoadingButton for form submissions
- Show loading indicators for delete/update operations
- Disable interactive elements during loading

### 2. Error Handling
- Display user-friendly error messages (not technical details)
- Use toast notifications for operation results
- Show inline validation errors on form fields
- Clear errors when user starts correcting them
- Provide retry options for failed operations

### 3. Retry Logic
- Only retry read operations (GET requests)
- Don't retry write operations (POST, PUT, DELETE) to prevent duplicates
- Use exponential backoff to avoid overwhelming the server
- Limit retry attempts (2-3 maximum)
- Only retry on network errors and 5xx server errors

### 4. Accessibility
- Ensure loading states are announced to screen readers
- Maintain focus management during loading
- Provide keyboard navigation for error recovery
- Use proper ARIA labels

## Example: Complete Form Implementation

```jsx
import { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import { LoadingButton } from '../../components/common';
import useFormValidation from '../../hooks/useFormValidation';
import roleService from '../../services/role.service';
import { useNotification } from '../../context/NotificationContext';
import RoleFormSkeleton from '../../components/roles/RoleFormSkeleton';

const RoleEditPage = () => {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ name: '', displayName: '' });
    const { errors, setError, clearError, setApiErrors, clearAllErrors } = useFormValidation();
    const { showNotification } = useNotification();

    // Initial load
    useEffect(() => {
        fetchRole();
    }, []);

    const fetchRole = async () => {
        try {
            setLoading(true);
            const data = await roleService.getById(id);
            setFormData(data);
        } catch (error) {
            showNotification(error.message || 'Failed to load role', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        clearAllErrors();

        // Validate
        if (!formData.name) {
            setError('name', 'Name is required');
            return;
        }

        try {
            setSubmitting(true);
            await roleService.update(id, formData);
            showNotification('Role updated successfully', 'success');
        } catch (error) {
            setApiErrors(error);
            showNotification(error.message || 'Failed to update role', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <RoleFormSkeleton />;
    }

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <TextField
                name="name"
                value={formData.name}
                onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearError('name');
                }}
                error={!!errors.name}
                helperText={errors.name}
                disabled={submitting}
            />
            
            <LoadingButton
                type="submit"
                variant="contained"
                loading={submitting}
                loadingText="Saving..."
            >
                Save
            </LoadingButton>
        </Box>
    );
};
```

## Testing

When testing components with loading and error states:

1. Test skeleton loaders appear during initial load
2. Test loading indicators during operations
3. Test error messages display correctly
4. Test retry mechanism works
5. Test form validation errors
6. Test disabled states during loading
7. Test error recovery flows
