# Button Component

## Overview

The standardized Button component is a wrapper around Material-UI's Button with consistent styling and additional features like loading states.

## Usage

```javascript
import Button from './components/common/Button';

// Basic button
<Button onClick={handleClick}>
  Click Me
</Button>

// Primary contained button (default)
<Button variant="contained" color="primary">
  Primary Action
</Button>

// Outlined button
<Button variant="outlined" color="secondary">
  Secondary Action
</Button>

// Text button
<Button variant="text">
  Text Button
</Button>

// With loading state
<Button loading={isLoading} onClick={handleSubmit}>
  Submit
</Button>

// With icons
<Button startIcon={<SaveIcon />}>
  Save
</Button>

<Button endIcon={<ArrowForwardIcon />}>
  Next
</Button>

// Different sizes
<Button size="small">Small</Button>
<Button size="medium">Medium</Button>
<Button size="large">Large</Button>

// Full width
<Button fullWidth>
  Full Width Button
</Button>

// Disabled
<Button disabled>
  Disabled Button
</Button>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | node | required | Button content |
| loading | boolean | false | Shows spinner and disables button |
| disabled | boolean | false | Disables the button |
| variant | 'contained' \| 'outlined' \| 'text' | 'contained' | Button style variant |
| size | 'small' \| 'medium' \| 'large' | 'medium' | Button size |
| color | 'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning' \| 'info' \| 'inherit' | 'primary' | Button color |
| fullWidth | boolean | false | Makes button full width |
| startIcon | node | - | Icon before button text |
| endIcon | node | - | Icon after button text |
| onClick | function | - | Click handler |
| type | 'button' \| 'submit' \| 'reset' | 'button' | Button type |
| sx | object | {} | Custom MUI sx styles |

## Variants

### Contained (Default)
High emphasis button with filled background.

```javascript
<Button variant="contained" color="primary">
  Primary Action
</Button>
```

### Outlined
Medium emphasis button with border.

```javascript
<Button variant="outlined" color="secondary">
  Secondary Action
</Button>
```

### Text
Low emphasis button without background or border.

```javascript
<Button variant="text">
  Text Button
</Button>
```

## Sizes

### Small
Compact button for tight spaces.

```javascript
<Button size="small">Small Button</Button>
```

### Medium (Default)
Standard button size for most use cases.

```javascript
<Button size="medium">Medium Button</Button>
```

### Large
Prominent button for primary actions.

```javascript
<Button size="large">Large Button</Button>
```

## Colors

All semantic colors are supported:

```javascript
<Button color="primary">Primary</Button>
<Button color="secondary">Secondary</Button>
<Button color="success">Success</Button>
<Button color="error">Error</Button>
<Button color="warning">Warning</Button>
<Button color="info">Info</Button>
```

## Loading State

The loading state shows a spinner and automatically disables the button:

```javascript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await submitForm();
  } finally {
    setLoading(false);
  }
};

<Button loading={loading} onClick={handleSubmit}>
  Submit
</Button>
```

## Form Integration

Use `type="submit"` for form submission:

```javascript
<form onSubmit={handleSubmit}>
  <TextField name="email" />
  <Button type="submit">
    Submit Form
  </Button>
</form>
```

## Custom Styling

Use the `sx` prop for custom styles:

```javascript
<Button
  sx={{
    minWidth: 200,
    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
    '&:hover': {
      background: 'linear-gradient(45deg, #FE6B8B 50%, #FF8E53 100%)',
    },
  }}
>
  Custom Styled
</Button>
```

## Accessibility

- All buttons have proper focus states
- Disabled buttons are not keyboard accessible
- Loading buttons announce their state to screen readers
- Use descriptive button text (avoid "Click here")

## Best Practices

### DO ✅

- Use `variant="contained"` for primary actions
- Use `variant="outlined"` for secondary actions
- Use `variant="text"` for tertiary actions
- Show loading state during async operations
- Use semantic colors (success for save, error for delete)
- Provide clear, action-oriented button text

### DON'T ❌

- Don't use multiple primary buttons in the same context
- Don't make buttons too small (minimum 44x44px for touch)
- Don't use vague text like "Click here" or "Submit"
- Don't forget to handle loading states
- Don't override core styles that break consistency

## Examples

### Save Button with Loading
```javascript
<Button
  variant="contained"
  color="success"
  startIcon={<SaveIcon />}
  loading={isSaving}
  onClick={handleSave}
>
  Save Changes
</Button>
```

### Delete Button with Confirmation
```javascript
<Button
  variant="outlined"
  color="error"
  startIcon={<DeleteIcon />}
  onClick={() => setShowConfirm(true)}
>
  Delete
</Button>
```

### Form Submit Button
```javascript
<Button
  type="submit"
  variant="contained"
  color="primary"
  fullWidth
  loading={isSubmitting}
>
  Create Account
</Button>
```

### Button Group
```javascript
<Box sx={{ display: 'flex', gap: 2 }}>
  <Button variant="outlined" onClick={handleCancel}>
    Cancel
  </Button>
  <Button variant="contained" onClick={handleSave}>
    Save
  </Button>
</Box>
```
