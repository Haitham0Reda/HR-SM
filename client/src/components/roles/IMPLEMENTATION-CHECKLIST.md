# Implementation Checklist for Role Management Pages

Use this checklist when implementing RoleEditPage and RoleViewPage to ensure all loading and error states are properly handled.

## RoleEditPage Implementation Checklist

### Setup
- [ ] Import required components and hooks
  ```jsx
  import { LoadingButton, ErrorBoundary } from '../common';
  import RoleFormSkeleton from './RoleFormSkeleton';
  import useFormValidation from '../../hooks/useFormValidation';
  import roleService from '../../services/role.service';
  import { useNotification } from '../../context/NotificationContext';
  ```

### State Management
- [ ] Add loading state for initial data fetch
  ```jsx
  const [loading, setLoading] = useState(true);
  ```
- [ ] Add submitting state for form submission
  ```jsx
  const [submitting, setSubmitting] = useState(false);
  ```
- [ ] Initialize form validation hook
  ```jsx
  const { errors, setError, clearError, setApiErrors, clearAllErrors } = useFormValidation();
  ```

### Data Fetching
- [ ] Fetch role data on mount (for edit mode)
- [ ] Show RoleFormSkeleton during loading
- [ ] Handle fetch errors with toast notification
- [ ] Set loading to false in finally block

### Form Validation
- [ ] Validate required fields (name, displayName)
- [ ] Validate name format (kebab-case)
- [ ] Validate at least one permission selected
- [ ] Show inline errors on form fields
- [ ] Clear errors when user starts typing

### Form Submission
- [ ] Prevent submission if validation fails
- [ ] Set submitting state to true
- [ ] Disable form fields during submission
- [ ] Use LoadingButton for submit button
- [ ] Handle API errors with setApiErrors
- [ ] Show success/error toast notifications
- [ ] Navigate on success
- [ ] Set submitting to false in finally block

### Error Handling
- [ ] Wrap page in ErrorBoundary
- [ ] Display inline validation errors
- [ ] Show error toast for API failures
- [ ] Parse and display API error responses
- [ ] Provide clear error messages

### User Experience
- [ ] Disable name field in edit mode
- [ ] Show loading text on submit button ("Saving...")
- [ ] Disable cancel button during submission
- [ ] Add breadcrumb navigation
- [ ] Show helpful helper text on fields

### Code Example
```jsx
const RoleEditPage = () => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { errors, setError, clearError, setApiErrors, clearAllErrors } = useFormValidation();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (id) fetchRole();
        else setLoading(false);
    }, [id]);

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
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            await roleService[id ? 'update' : 'create'](id || formData, formData);
            showNotification('Role saved successfully', 'success');
            navigate('/app/roles');
        } catch (error) {
            setApiErrors(error);
            showNotification(error.message || 'Failed to save role', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <RoleFormSkeleton />;

    return (
        <ErrorBoundary>
            {/* Form content */}
            <LoadingButton loading={submitting} loadingText="Saving...">
                Save
            </LoadingButton>
        </ErrorBoundary>
    );
};
```

---

## RoleViewPage Implementation Checklist

### Setup
- [ ] Import required components
  ```jsx
  import { LoadingButton, ErrorBoundary } from '../common';
  import RoleViewSkeleton from './RoleViewSkeleton';
  import ConfirmDialog from '../common/ConfirmDialog';
  import roleService from '../../services/role.service';
  import { useNotification } from '../../context/NotificationContext';
  ```

### State Management
- [ ] Add loading state for initial data fetch
  ```jsx
  const [loading, setLoading] = useState(true);
  ```
- [ ] Add deleting state for delete operation
  ```jsx
  const [deleting, setDeleting] = useState(false);
  ```
- [ ] Add state for delete confirmation dialog
  ```jsx
  const [openConfirm, setOpenConfirm] = useState(false);
  ```

### Data Fetching
- [ ] Fetch role data on mount
- [ ] Show RoleViewSkeleton during loading
- [ ] Handle fetch errors with toast notification
- [ ] Set loading to false in finally block
- [ ] Handle role not found (404)

### Delete Operation
- [ ] Show confirmation dialog on delete click
- [ ] Disable delete button for system roles
- [ ] Set deleting state during operation
- [ ] Pass loading state to ConfirmDialog
- [ ] Handle delete errors with toast
- [ ] Navigate to list on success
- [ ] Set deleting to false in finally block

### Error Handling
- [ ] Wrap page in ErrorBoundary
- [ ] Show error toast for API failures
- [ ] Handle 404 errors gracefully
- [ ] Provide retry option for failed loads

### User Experience
- [ ] Add breadcrumb navigation
- [ ] Show role metadata clearly
- [ ] Display permissions by category
- [ ] Show visual indicators for system roles
- [ ] Disable delete for system roles with tooltip
- [ ] Add edit button linking to edit page

### Code Example
```jsx
const RoleViewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [role, setRole] = useState(null);
    const { showNotification } = useNotification();

    useEffect(() => {
        fetchRole();
    }, [id]);

    const fetchRole = async () => {
        try {
            setLoading(true);
            const data = await roleService.getById(id);
            setRole(data);
        } catch (error) {
            showNotification(error.message || 'Failed to load role', 'error');
            if (error.status === 404) {
                navigate('/app/roles');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await roleService.delete(id);
            showNotification('Role deleted successfully', 'success');
            navigate('/app/roles');
        } catch (error) {
            showNotification(error.message || 'Failed to delete role', 'error');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <RoleViewSkeleton />;

    return (
        <ErrorBoundary>
            {/* View content */}
            <Button
                onClick={() => setOpenConfirm(true)}
                disabled={role.isSystemRole}
            >
                Delete
            </Button>

            <ConfirmDialog
                open={openConfirm}
                onConfirm={handleDelete}
                onCancel={() => setOpenConfirm(false)}
                loading={deleting}
            />
        </ErrorBoundary>
    );
};
```

---

## General Best Practices

### Loading States
- ✅ Always show skeleton loaders for initial page loads
- ✅ Use LoadingButton for form submissions
- ✅ Show loading indicators for async operations
- ✅ Disable interactive elements during loading
- ✅ Provide loading text that describes the action

### Error Handling
- ✅ Display user-friendly error messages
- ✅ Use toast notifications for operation results
- ✅ Show inline validation errors on forms
- ✅ Clear errors when user corrects them
- ✅ Provide retry options for failed operations
- ✅ Handle different error types appropriately (404, 403, 500, etc.)

### Form Validation
- ✅ Validate on submit, not on every keystroke
- ✅ Show errors after first submit attempt
- ✅ Clear errors when user starts correcting
- ✅ Disable submit button if form has errors
- ✅ Provide helpful helper text
- ✅ Use consistent error message format

### API Calls
- ✅ Always use try-catch-finally blocks
- ✅ Set loading state in try block
- ✅ Handle errors in catch block
- ✅ Reset loading state in finally block
- ✅ Show notifications for success/error
- ✅ Let retry mechanism handle transient failures

### Accessibility
- ✅ Ensure loading states are announced
- ✅ Maintain focus management
- ✅ Use proper ARIA labels
- ✅ Ensure keyboard navigation works
- ✅ Provide alternative text for icons
- ✅ Meet color contrast requirements

---

## Testing Checklist

### Manual Testing
- [ ] Test initial page load with skeleton
- [ ] Test form submission with loading state
- [ ] Test delete operation with loading state
- [ ] Test error scenarios (network error, 500, 404)
- [ ] Test form validation (required fields, format)
- [ ] Test retry mechanism (disconnect network)
- [ ] Test on different screen sizes
- [ ] Test keyboard navigation
- [ ] Test with screen reader

### Edge Cases
- [ ] Test with slow network (throttle to 3G)
- [ ] Test with no network (offline)
- [ ] Test with invalid data
- [ ] Test with missing required fields
- [ ] Test with duplicate role names
- [ ] Test deleting role with assigned users
- [ ] Test editing system roles
- [ ] Test concurrent operations

### Error Recovery
- [ ] Verify errors clear on field change
- [ ] Verify retry works after network error
- [ ] Verify form re-enables after error
- [ ] Verify user can navigate away during error
- [ ] Verify error messages are helpful

---

## Common Pitfalls to Avoid

❌ **Don't** forget to set loading to false in finally block
✅ **Do** always use finally to reset loading state

❌ **Don't** retry write operations (POST, PUT, DELETE)
✅ **Do** only retry read operations (GET)

❌ **Don't** show technical error messages to users
✅ **Do** show user-friendly error messages

❌ **Don't** forget to disable form during submission
✅ **Do** disable all interactive elements during loading

❌ **Don't** forget to clear errors when user types
✅ **Do** clear field errors on change

❌ **Don't** use spinners for initial page load
✅ **Do** use skeleton loaders for better UX

❌ **Don't** forget to wrap pages in ErrorBoundary
✅ **Do** wrap all pages to catch unexpected errors

❌ **Don't** forget to handle 404 errors
✅ **Do** redirect or show appropriate message

---

## Resources

- **Documentation**: `README-loading-states.md`
- **Visual Guide**: `VISUAL-GUIDE.md`
- **Example Template**: `RolePageTemplate.example.jsx`
- **Implementation Summary**: `IMPLEMENTATION-SUMMARY.md`

## Questions?

Refer to the existing RolesPage implementation for a working example of all these patterns in action.
