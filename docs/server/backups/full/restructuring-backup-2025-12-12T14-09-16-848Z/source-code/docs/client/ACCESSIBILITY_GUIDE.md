# Accessibility Guide

## Overview

The HR-SM application is designed to be accessible to all users, following WCAG 2.1 Level AA standards. This guide outlines our accessibility features and best practices.

## Standards Compliance

- **WCAG 2.1 Level AA** compliant
- **Section 508** compliant
- **ADA** (Americans with Disabilities Act) compliant

## Key Accessibility Features

### 1. Keyboard Navigation

All interactive elements are accessible via keyboard:

- **Tab**: Navigate forward through interactive elements
- **Shift + Tab**: Navigate backward
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dialogs
- **Arrow Keys**: Navigate within menus and lists

#### Focus Management

- Visible focus indicators on all focusable elements
- Focus trap in modals to prevent focus from escaping
- Logical tab order following visual layout
- Skip links to bypass repetitive navigation

### 2. Screen Reader Support

#### Semantic HTML

```jsx
// Good: Semantic HTML
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

// Bad: Non-semantic HTML
<div onClick={navigate}>Dashboard</div>
```

#### ARIA Labels

```jsx
// Icon buttons with labels
<IconButton aria-label="Delete user">
  <DeleteIcon />
</IconButton>

// Form inputs with labels
<TextField
  label="Email Address"
  aria-describedby="email-helper-text"
/>
<FormHelperText id="email-helper-text">
  Enter your work email
</FormHelperText>
```

#### Live Regions

```jsx
// Announce dynamic content changes
<div role="status" aria-live="polite">
  {successMessage}
</div>

<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

### 3. Visual Accessibility

#### Color Contrast

All text meets minimum contrast ratios:

- **Normal text**: 4.5:1 minimum
- **Large text** (18pt+): 3:1 minimum
- **UI components**: 3:1 minimum

```javascript
// Design tokens ensure proper contrast
const designTokens = {
  colors: {
    text: {
      primary: '#1a1a1a',    // 16:1 contrast on white
      secondary: '#666666',   // 7:1 contrast on white
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    }
  }
};
```

#### Color Independence

Information is never conveyed by color alone:

```jsx
// Good: Icon + color + text
<Alert severity="error" icon={<ErrorIcon />}>
  Error: Failed to save changes
</Alert>

// Bad: Color only
<div style={{ color: 'red' }}>Error</div>
```

#### Reduced Motion

Respects user's motion preferences:

```css
/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4. Form Accessibility

#### Label Association

```jsx
// Explicit label association
<TextField
  id="employee-name"
  label="Employee Name"
  required
  error={!!errors.name}
  helperText={errors.name}
  aria-required="true"
  aria-invalid={!!errors.name}
/>
```

#### Error Handling

```jsx
// Accessible error messages
<FormControl error={!!errors.email}>
  <InputLabel htmlFor="email">Email</InputLabel>
  <Input
    id="email"
    aria-describedby="email-error"
    aria-invalid={!!errors.email}
  />
  {errors.email && (
    <FormHelperText id="email-error" role="alert">
      {errors.email}
    </FormHelperText>
  )}
</FormControl>
```

#### Required Fields

```jsx
// Indicate required fields
<TextField
  label="Department"
  required
  aria-required="true"
  InputProps={{
    'aria-label': 'Department (required)'
  }}
/>
```

### 5. Modal Accessibility

```jsx
<Dialog
  open={open}
  onClose={handleClose}
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <DialogTitle id="dialog-title">
    Confirm Delete
  </DialogTitle>
  <DialogContent>
    <DialogContentText id="dialog-description">
      Are you sure you want to delete this user?
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleDelete} autoFocus>
      Delete
    </Button>
  </DialogActions>
</Dialog>
```

### 6. Table Accessibility

```jsx
<Table aria-label="Employee list">
  <TableHead>
    <TableRow>
      <TableCell>Name</TableCell>
      <TableCell>Department</TableCell>
      <TableCell>Actions</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {employees.map((employee) => (
      <TableRow key={employee.id}>
        <TableCell>{employee.name}</TableCell>
        <TableCell>{employee.department}</TableCell>
        <TableCell>
          <IconButton
            aria-label={`Edit ${employee.name}`}
            onClick={() => handleEdit(employee.id)}
          >
            <EditIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Testing for Accessibility

### Automated Testing

```bash
# Run accessibility tests
npm run test:a11y
```

```javascript
// Using jest-axe
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing

#### Keyboard Testing

1. Unplug your mouse
2. Navigate the entire application using only keyboard
3. Verify all functionality is accessible
4. Check focus indicators are visible

#### Screen Reader Testing

**Windows**: NVDA (free)
```bash
# Download from: https://www.nvaccess.org/
```

**macOS**: VoiceOver (built-in)
```bash
# Enable: Cmd + F5
```

**Testing Checklist**:
- [ ] All images have alt text
- [ ] All buttons have labels
- [ ] Form fields are properly labeled
- [ ] Error messages are announced
- [ ] Dynamic content changes are announced
- [ ] Heading hierarchy is logical

### Browser Extensions

- **axe DevTools**: Automated accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Lighthouse**: Comprehensive audits

## Common Accessibility Patterns

### Skip Links

```jsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content">
  {/* Main content */}
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### Loading States

```jsx
<Button disabled={loading} aria-busy={loading}>
  {loading ? (
    <>
      <CircularProgress size={20} aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </>
  ) : (
    'Submit'
  )}
</Button>
```

### Tooltips

```jsx
<Tooltip title="Delete user">
  <IconButton aria-label="Delete user">
    <DeleteIcon />
  </IconButton>
</Tooltip>
```

## Accessibility Checklist

### General

- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA standards
- [ ] Text can be resized to 200% without loss of functionality
- [ ] Page has a descriptive title
- [ ] Language is specified in HTML

### Keyboard

- [ ] All functionality available via keyboard
- [ ] Focus order is logical
- [ ] Focus indicators are visible
- [ ] No keyboard traps
- [ ] Skip links provided

### Screen Readers

- [ ] Semantic HTML used throughout
- [ ] ARIA labels on all interactive elements
- [ ] Form fields properly labeled
- [ ] Error messages associated with fields
- [ ] Dynamic content changes announced

### Forms

- [ ] All inputs have labels
- [ ] Required fields indicated
- [ ] Error messages clear and helpful
- [ ] Validation messages announced
- [ ] Submit buttons clearly labeled

### Navigation

- [ ] Consistent navigation across pages
- [ ] Current page indicated
- [ ] Breadcrumbs provided where appropriate
- [ ] Multiple ways to navigate

## Resources

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Material-UI Accessibility](https://mui.com/material-ui/guides/accessibility/)

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [NVDA Screen Reader](https://www.nvaccess.org/)

### Testing Services

- [WebAIM](https://webaim.org/)
- [Deque](https://www.deque.com/)
- [Level Access](https://www.levelaccess.com/)

## Support

For accessibility issues or questions:

1. Open an issue on GitHub
2. Contact the development team
3. Email: accessibility@hr-sm.com

## Commitment

We are committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.

**Last Updated**: December 4, 2024
