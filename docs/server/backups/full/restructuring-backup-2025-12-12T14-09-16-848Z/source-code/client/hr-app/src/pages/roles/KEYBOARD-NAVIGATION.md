# Keyboard Navigation Support - Role Management UI

This document describes the keyboard navigation features implemented in the Role Management UI to ensure full accessibility and efficient keyboard-only operation.

## Overview

All interactive elements in the role management pages are fully keyboard accessible, with proper tab order, ARIA labels, and keyboard shortcuts for common actions.

## Global Keyboard Shortcuts

### RolesPage (List View)
- **Ctrl/Cmd + K**: Focus the search input field
- **Ctrl/Cmd + N**: Navigate to create new role page
- **Escape**: Clear all search filters and reset view
- **Tab**: Navigate through interactive elements in logical order
- **Enter/Space**: Activate buttons and clickable cards

### RoleEditPage (Create/Edit Form)
- **Ctrl/Cmd + S**: Save the form (create or update role)
- **Escape**: Cancel and return to roles list
- **Tab**: Navigate through form fields and permission checkboxes
- **Space**: Toggle checkboxes and expand/collapse accordions
- **Enter**: Submit the form when focused on submit button

### RoleViewPage (Details View)
- **E**: Edit the current role (when not in an input field)
- **Delete**: Delete the current role (if not a system role)
- **Escape**: Return to roles list
- **Tab**: Navigate through interactive elements

## Keyboard Navigation Features

### 1. Tab Order
All interactive elements follow a logical tab order:
- Breadcrumb navigation
- Page header buttons (Create Role, Sync System Roles)
- Statistics cards (clickable filters)
- Search and filter inputs
- Table rows and action buttons
- Form fields and permission checkboxes

### 2. Focus Indicators
All focusable elements have visible focus indicators:
- **2px solid outline** in primary color
- **2px offset** for better visibility
- Consistent across all components

### 3. ARIA Labels and Roles
All interactive elements include proper ARIA attributes:
- `aria-label`: Descriptive labels for buttons and inputs
- `aria-describedby`: Links to helper text and descriptions
- `aria-current`: Indicates current page in breadcrumbs
- `aria-expanded`: Indicates accordion state
- `aria-checked`: Indicates checkbox state
- `role`: Semantic roles for custom components

### 4. Keyboard-Accessible Cards
Statistics cards on the roles page are fully keyboard accessible:
- Converted to `<button>` elements with proper semantics
- Support Enter and Space key activation
- Include focus indicators
- Have descriptive ARIA labels

### 5. Breadcrumb Navigation
Breadcrumbs support keyboard navigation:
- Tab to navigate between links
- Enter or Space to activate links
- Proper ARIA labels for screen readers

### 6. Table Navigation
The roles table is fully keyboard accessible:
- Table has `role="region"` with `aria-label`
- Column headers use `scope="col"`
- Action buttons are focusable and have tooltips
- Tab order flows logically through rows

### 7. Form Accessibility
Forms include comprehensive keyboard support:
- All inputs are keyboard accessible
- Proper labels and helper text associations
- Error messages linked via `aria-describedby`
- Submit button can be triggered with Ctrl/Cmd + S

### 8. Permission Selection
Permission checkboxes are fully keyboard accessible:
- Tab to navigate between permissions
- Space to toggle selection
- Accordion headers support Enter/Space to expand
- "Select All" checkbox in each category header
- Focus indicators on checkbox containers

### 9. Dialog Accessibility
Confirmation dialogs are keyboard accessible:
- Focus trapped within dialog when open
- Escape to close (where appropriate)
- Tab cycles through dialog buttons
- Proper ARIA labels and descriptions

## Testing Keyboard Navigation

### Manual Testing Checklist
- [ ] Tab through all pages without using mouse
- [ ] Verify all interactive elements are reachable
- [ ] Test all keyboard shortcuts
- [ ] Verify focus indicators are visible
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify no keyboard traps
- [ ] Test form submission with keyboard only
- [ ] Test dialog interactions with keyboard
- [ ] Verify accordion expand/collapse with keyboard
- [ ] Test permission selection with keyboard only

### Automated Testing
Consider adding automated tests for:
- Tab order verification
- ARIA attribute presence
- Keyboard event handlers
- Focus management in dialogs

## Accessibility Standards Compliance

This implementation follows:
- **WCAG 2.1 Level AA** guidelines
- **WAI-ARIA 1.2** best practices
- **Keyboard accessibility** requirements
- **Focus management** standards

## Browser Support

Keyboard navigation is tested and supported in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Future Enhancements

Potential improvements for keyboard navigation:
1. **Arrow key navigation** in tables (move between cells)
2. **Type-ahead search** in permission lists
3. **Vim-style navigation** (optional power user feature)
4. **Customizable keyboard shortcuts**
5. **Keyboard shortcut help dialog** (press ? to show)

## Known Limitations

- Some keyboard shortcuts may conflict with browser shortcuts
- Screen reader testing should be performed regularly
- Mobile keyboard navigation may differ from desktop

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [Material-UI Accessibility](https://mui.com/material-ui/guides/accessibility/)
