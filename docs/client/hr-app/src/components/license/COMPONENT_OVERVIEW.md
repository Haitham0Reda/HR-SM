# License Components Visual Overview

## Component Hierarchy

```
License Components
│
├── LockedFeature (Inline Overlay)
│   ├── Lock Icon (circular background)
│   ├── Feature Name (h4)
│   ├── Description (body text)
│   ├── Pricing Box
│   │   ├── "Starting at" label
│   │   └── Price display
│   ├── Upgrade Button (primary CTA)
│   └── Additional Info (caption)
│
├── LockedPage (Full Page)
│   ├── Lock Icon (large, circular)
│   ├── Module Name (h3)
│   ├── Description (h6)
│   ├── Features List (optional)
│   │   └── Bullet points
│   ├── Pricing Box (optional)
│   │   ├── "Starting at" label
│   │   └── Price display
│   ├── Action Buttons
│   │   ├── Back to Dashboard (outlined)
│   │   └── Upgrade (contained, primary)
│   └── Additional Info (body2)
│
└── UpgradeModal (Dialog)
    ├── Header
    │   ├── Lock Icon + "Upgrade Required"
    │   └── Close Button (X)
    ├── Content
    │   ├── Feature Info
    │   │   ├── Feature Name (h6)
    │   │   └── Description (body2)
    │   ├── Current Plan Box
    │   │   ├── Current tier display
    │   │   └── Required tier notice
    │   └── Pricing Tiers
    │       └── For each tier:
    │           ├── Tier Name + Price
    │           ├── Features List (with checkmarks)
    │           └── Upgrade Button
    └── Footer
        ├── View All Pricing (text button)
        └── Maybe Later (outlined button)
```

## Visual States

### LockedFeature States

1. **Default State**

   - Dashed border
   - Semi-transparent background
   - Lock icon in circle
   - All content visible
   - Upgrade button ready

2. **Hover State** (on button)

   - Button shadow increases
   - Button translates up 2px
   - Smooth transition

3. **Dark Mode**
   - Lighter background overlay
   - Adjusted text colors
   - Maintained contrast ratios

### LockedPage States

1. **Default State**

   - Centered content
   - Full viewport height
   - Large lock icon
   - Two action buttons

2. **With Features**

   - Features box with border
   - Bullet list of features
   - Proper spacing

3. **Without Features**

   - Compact layout
   - Focus on description
   - Pricing emphasized

4. **Dark Mode**
   - Dark background
   - Light text
   - Adjusted borders

### UpgradeModal States

1. **Open State**

   - Modal overlay (backdrop)
   - Centered dialog
   - Focus trapped inside
   - Scrollable content

2. **Closed State**

   - Not rendered
   - No DOM presence

3. **Tier Highlighting**

   - Required tier has primary border
   - Required tier has tinted background
   - Hover effect on all tiers

4. **Dark Mode**
   - Dark dialog background
   - Light text
   - Adjusted tier backgrounds

## Responsive Behavior

### LockedFeature

- **Desktop**: Full width with max constraints
- **Tablet**: Maintains layout, adjusts padding
- **Mobile**: Stacks content, reduces padding

### LockedPage

- **Desktop**: Centered with max-width container
- **Tablet**: Maintains layout, adjusts spacing
- **Mobile**: Full width, stacked buttons, reduced icon size

### UpgradeModal

- **Desktop**: Fixed width dialog (md)
- **Tablet**: Slightly narrower, maintains layout
- **Mobile**: Full width, scrollable content

## Color Palette

### Light Mode

- Background: `rgba(0, 0, 0, 0.02)` - Very light gray
- Border: `divider` - Light gray
- Text Primary: `text.primary` - Dark gray/black
- Text Secondary: `text.secondary` - Medium gray
- Primary Color: `primary.main` - Blue
- Icon Background: `rgba(0, 0, 0, 0.08)` - Light gray

### Dark Mode

- Background: `rgba(255, 255, 255, 0.02)` - Very dark with slight lightness
- Border: `divider` - Dark gray
- Text Primary: `text.primary` - Light gray/white
- Text Secondary: `text.secondary` - Medium gray
- Primary Color: `primary.main` - Light blue
- Icon Background: `rgba(255, 255, 255, 0.08)` - Dark gray

## Spacing Scale

All components use the 8px base unit:

- **xs**: 4px (0.5 units)
- **sm**: 8px (1 unit)
- **md**: 16px (2 units)
- **lg**: 24px (3 units)
- **xl**: 32px (4 units)
- **xxl**: 48px (6 units)
- **xxxl**: 64px (8 units)

## Typography Scale

- **Feature/Module Names**: h4 (1.5rem) or h3 (1.75rem)
- **Descriptions**: body1 (1rem) or h6 (1rem)
- **Pricing**: h5 (1.25rem) or h4 (1.5rem)
- **Labels**: body2 (0.875rem)
- **Captions**: caption (0.75rem)

## Icon Sizes

- **LockedFeature**: 40px lock icon in 80px circle
- **LockedPage**: 60px lock icon in 120px circle
- **UpgradeModal**: 28px lock icon (inline with title)
- **Feature Checkmarks**: 16px check icons

## Border Radius

- **Containers**: lg (12px)
- **Buttons**: md (8px)
- **Icon Circles**: round (50%)
- **Pricing Boxes**: md (8px) or lg (12px)

## Shadows

- **Buttons (default)**: md
- **Buttons (hover)**: lg
- **Modal**: xl
- **Pricing Boxes**: none (uses borders)

## Transitions

All interactive elements use smooth transitions:

- **Duration**: 0.2s (200ms)
- **Easing**: ease-in-out
- **Properties**: transform, box-shadow, background-color

## Accessibility Features

### Focus Indicators

- Visible focus ring on all interactive elements
- High contrast focus states
- Keyboard navigation support

### Screen Reader Support

- Proper ARIA labels on all interactive elements
- Semantic HTML structure
- Hidden decorative icons (aria-hidden)
- Descriptive button labels

### Keyboard Navigation

- Tab order follows visual order
- Enter/Space activates buttons
- Escape closes modal
- Focus trapped in modal when open

## Component Sizes

### LockedFeature

- **Min Height**: 400px
- **Padding**: xxl (48px)
- **Max Width**: Inherits from parent

### LockedPage

- **Min Height**: 100vh
- **Max Width**: md (960px) container
- **Padding**: lg (24px)

### UpgradeModal

- **Max Width**: md (960px)
- **Padding**: lg (24px)
- **Content**: Scrollable if needed

## Integration Examples

### With License Context (Future)

```jsx
const MyFeature = () => {
  const { isModuleEnabled } = useLicense();

  if (!isModuleEnabled('attendance')) {
    return <LockedFeature moduleKey="attendance" ... />;
  }

  return <FeatureContent />;
};
```

### With Router

```jsx
const PayrollPage = () => {
  const { isModuleEnabled } = useLicense();

  if (!isModuleEnabled('payroll')) {
    return <LockedPage moduleKey="payroll" ... />;
  }

  return <PayrollContent />;
};
```

### With Modal State

```jsx
const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

const handleFeatureClick = () => {
  if (!isFeatureEnabled('custom-reports')) {
    setUpgradeModalOpen(true);
  }
};

<UpgradeModal
  open={upgradeModalOpen}
  onClose={() => setUpgradeModalOpen(false)}
  ...
/>
```
