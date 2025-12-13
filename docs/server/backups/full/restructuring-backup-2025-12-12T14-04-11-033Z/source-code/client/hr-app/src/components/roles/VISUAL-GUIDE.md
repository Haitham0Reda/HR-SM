# Loading and Error States - Visual Guide

## Loading States Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER NAVIGATES TO PAGE                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  SKELETON LOADER APPEARS                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ████████████  ████████  ████████                     │  │
│  │  ████  ████████  ████████  ████████                   │  │
│  │  ████████  ████████  ████████  ████████               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA LOADS FROM API                       │
│              (with automatic retry on failure)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ACTUAL CONTENT APPEARS                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Roles                                                 │  │
│  │  Total: 8  System: 5  Custom: 3                       │  │
│  │  [Search] [Filter]                                     │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ admin    │ Administrator │ Full access │ System │  │  │
│  │  │ hr       │ HR Manager    │ HR access   │ System │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Form Submission Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FILLS OUT FORM                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Name: [project-manager____________]                   │  │
│  │  Display Name: [Project Manager____]                   │  │
│  │  Description: [Manages projects____]                   │  │
│  │                                                         │  │
│  │  [Cancel]  [Save]                                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER CLICKS SAVE                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  VALIDATION RUNS (CLIENT)                    │
│                                                              │
│  ✓ Name is required                                         │
│  ✓ Name format is correct                                   │
│  ✓ Display name is required                                 │
│  ✓ At least one permission selected                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              VALID │                   │ INVALID
                    ↓                   ↓
┌─────────────────────────────┐  ┌──────────────────────────┐
│   BUTTON SHOWS LOADING       │  │  INLINE ERRORS SHOWN     │
│  ┌───────────────────────┐  │  │  ┌────────────────────┐  │
│  │  Name: [...]          │  │  │  │  Name: [...]       │  │
│  │  [Cancel] [⟳ Saving...]│  │  │  │  ⚠ Name required  │  │
│  └───────────────────────┘  │  │  │  [Cancel] [Save]   │  │
│  Form fields disabled       │  │  └────────────────────┘  │
└─────────────────────────────┘  └──────────────────────────┘
                ↓                            ↓
┌─────────────────────────────┐         USER FIXES
│    API REQUEST SENT          │         ERRORS
│  (with retry on failure)     │              ↓
└─────────────────────────────┘         BACK TO FORM
                ↓
        ┌───────┴───────┐
        │               │
  SUCCESS │               │ ERROR
        ↓               ↓
┌─────────────┐  ┌──────────────────┐
│  ✓ Success  │  │  ✗ Error Toast   │
│  Toast      │  │  + Inline Errors │
│  Navigate   │  │  Form enabled    │
│  to list    │  │  User can retry  │
└─────────────┘  └──────────────────┘
```

## Delete Operation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  USER CLICKS DELETE BUTTON                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              CONFIRMATION DIALOG APPEARS                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      ⚠                                 │  │
│  │                 Delete Role                            │  │
│  │                                                         │  │
│  │  Are you sure you want to delete "Project Manager"?   │  │
│  │  This action cannot be undone.                         │  │
│  │                                                         │  │
│  │              [Cancel]  [Delete]                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  USER CONFIRMS DELETION                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│            DIALOG SHOWS LOADING STATE                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      ⚠                                 │  │
│  │                 Delete Role                            │  │
│  │                                                         │  │
│  │  Are you sure you want to delete "Project Manager"?   │  │
│  │  This action cannot be undone.                         │  │
│  │                                                         │  │
│  │         [Cancel] [⟳ Delete] (both disabled)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DELETE API CALL                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
              SUCCESS │                   │ ERROR
                    ↓                   ↓
┌─────────────────────────────┐  ┌──────────────────────────┐
│  ✓ Success Toast            │  │  ✗ Error Toast           │
│  Dialog closes              │  │  Dialog stays open       │
│  List refreshes             │  │  User can retry          │
│  Role removed from table    │  │  or cancel               │
└─────────────────────────────┘  └──────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      API CALL FAILS                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  RETRY MECHANISM CHECKS                      │
│                                                              │
│  Is it a network error? ────────────────────→ YES → RETRY   │
│  Is it a 5xx server error? ──────────────────→ YES → RETRY   │
│  Is it a 408 timeout? ───────────────────────→ YES → RETRY   │
│  Is it a 429 rate limit? ────────────────────→ YES → RETRY   │
│  Is it a 4xx client error? ──────────────────→ NO  → FAIL    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
                RETRY │                   │ FAIL
                    ↓                   ↓
┌─────────────────────────────┐  ┌──────────────────────────┐
│  WAIT WITH EXPONENTIAL       │  │  ERROR HANDLING          │
│  BACKOFF                     │  │                          │
│  Attempt 1: 1 second         │  │  ┌────────────────────┐ │
│  Attempt 2: 2 seconds        │  │  │  ✗ Error Toast     │ │
│  Attempt 3: 4 seconds        │  │  │  "Failed to load"  │ │
│  Max: 10 seconds             │  │  │  [Retry] button    │ │
│                              │  │  └────────────────────┘ │
│  Then retry API call         │  │                          │
└─────────────────────────────┘  │  Inline errors if form   │
                ↓                │  User can fix and retry  │
        Back to API call         └──────────────────────────┘
```

## Component Error Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                JAVASCRIPT ERROR OCCURS                       │
│              (e.g., undefined property access)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              ERROR BOUNDARY CATCHES ERROR                    │
│                                                              │
│  Instead of white screen of death:                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              USER-FRIENDLY ERROR PAGE                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      ⚠                                 │  │
│  │          Oops! Something went wrong                    │  │
│  │                                                         │  │
│  │  We encountered an unexpected error.                   │  │
│  │  Don't worry, your data is safe.                       │  │
│  │                                                         │  │
│  │  [Development mode: error stack trace shown]           │  │
│  │                                                         │  │
│  │         [Try Again]  [Reload Page]                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## State Transitions Summary

### Page Load States
1. **Initial** → Skeleton Loader
2. **Loading** → Skeleton Loader (animated)
3. **Success** → Actual Content (fade in)
4. **Error** → Error Toast + Retry Option

### Form States
1. **Idle** → Form enabled, no errors
2. **Validating** → Client-side validation
3. **Submitting** → Loading button, form disabled
4. **Success** → Success toast, navigate away
5. **Error** → Error toast + inline errors, form enabled

### Delete States
1. **Idle** → Delete button enabled
2. **Confirming** → Dialog open, buttons enabled
3. **Deleting** → Dialog open, loading spinner, buttons disabled
4. **Success** → Dialog closes, success toast, list refreshes
5. **Error** → Dialog stays open, error toast, buttons enabled

## Visual Indicators

### Loading Indicators
- **Skeleton Loaders**: Gray animated placeholders matching page layout
- **Spinner**: Circular progress indicator (20px) next to button text
- **Loading Button**: "⟳ Saving..." with spinner icon

### Error Indicators
- **Toast Notifications**: Red background, error icon, auto-dismiss
- **Inline Errors**: Red text below field, red border on input
- **Error Icon**: ⚠ warning icon in dialogs and error pages

### Success Indicators
- **Toast Notifications**: Green background, checkmark icon, auto-dismiss
- **Smooth Transitions**: Fade in/out animations for state changes

## Accessibility Features

- All loading states announced to screen readers
- Focus management during loading (trapped in dialog)
- Keyboard navigation maintained
- ARIA labels on all interactive elements
- Color contrast meets WCAG AA standards
- Error messages associated with form fields
