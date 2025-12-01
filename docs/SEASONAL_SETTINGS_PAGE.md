# Seasonal Decorations Settings Page - Documentation

## Overview

A complete admin dashboard page for managing seasonal decorations and themes across the application. Features a modern, responsive UI with real-time previews and comprehensive settings management.

## Features

### ✨ General Settings

- **Enable/Disable Decorations**: Master toggle for all seasonal decorations
- **Auto-Detect Season**: Automatically detect and apply seasonal themes based on current date
- **Manual Season Override**: Select specific season when auto-detect is disabled
- **Opacity Control**: Slider to adjust decoration transparency (0.1 - 1.0)
- **Mobile Support**: Toggle to enable/disable decorations on mobile devices

### 🎄 Christmas Settings

- Enable/disable Christmas decorations
- Customizable greeting message (max 100 characters)
- Snow animation effect toggle
- Red-themed card with Christmas emoji

### 🎆 New Year Settings

- Enable/disable New Year decorations
- Customizable greeting message (max 100 characters)
- Fireworks animation effect toggle
- Blue-themed card with fireworks emoji

### 🌙 Eid al-Fitr Settings

- Enable/disable Eid al-Fitr decorations
- Bilingual messages (English & Arabic, max 100 chars each)
- Crescent moon animation effect toggle
- Purple-themed card with crescent emoji
- RTL support for Arabic text

### 🕌 Eid al-Adha Settings

- Enable/disable Eid al-Adha decorations
- Bilingual messages (English & Arabic, max 100 chars each)
- Lantern animation effect toggle
- Orange-themed card with mosque emoji
- RTL support for Arabic text

## UI Components

### Header Section

- Gradient background (purple theme)
- Large celebration icon
- Title and description
- Reset and Save buttons
- Responsive layout

### Changes Alert

- Collapsible alert showing unsaved changes
- Quick save action button
- Info severity styling

### Active Season Preview

- Shows currently active season
- Success-themed border and background
- Only visible when decorations are enabled

### Settings Cards

- Clean, modern card design
- Color-coded borders when enabled
- Organized in responsive grid
- Smooth transitions and animations

### Bottom Save Bar

- Fixed position at bottom
- Appears only when there are unsaved changes
- Contains Reset and Save buttons
- High z-index for visibility

## State Management

### Settings Object Structure

```javascript
{
  enabled: boolean,              // Master toggle
  autoDetect: boolean,           // Auto-detect season
  manualSeason: string,          // Manual season selection
  opacity: number,               // 0.1 - 1.0
  enableMobile: boolean,         // Mobile support

  christmas: {
    enabled: boolean,
    message: string,             // Max 100 chars
    snowEffect: boolean
  },

  newyear: {
    enabled: boolean,
    message: string,             // Max 100 chars
    fireworksEffect: boolean
  },

  eidFitr: {
    enabled: boolean,
    messageEn: string,           // Max 100 chars
    messageAr: string,           // Max 100 chars
    crescentEffect: boolean
  },

  eidAdha: {
    enabled: boolean,
    messageEn: string,           // Max 100 chars
    messageAr: string,           // Max 100 chars
    lanternEffect: boolean
  }
}
```

### State Persistence

- Settings saved to `localStorage` on save
- Loaded from `localStorage` on component mount
- Survives page refreshes

## Functions

### handleChange(path, value)

Updates nested state using dot notation path

```javascript
handleChange("christmas.message", "Merry Christmas!");
handleChange("opacity", 0.9);
```

### handleSave()

- Saves settings to localStorage
- Shows success notification
- Resets hasChanges flag
- Simulates API call with 1s delay

### handleReset()

- Resets all settings to defaults
- Sets hasChanges flag
- Shows info notification

### getCurrentSeason()

- Returns active season based on settings
- Respects enabled and autoDetect flags
- Simplified auto-detection logic (can be enhanced)

## Validation

### Character Limits

- All message fields: 100 characters maximum
- Real-time character counter displayed
- Input maxLength enforced

### Dependencies

- Settings disabled when master toggle is off
- Season-specific settings disabled when season is disabled
- Manual season only available when auto-detect is off

## Styling

### Color Scheme

- **Header**: Purple gradient (#667eea → #764ba2)
- **Christmas**: Red (#c62828)
- **New Year**: Blue (#1976d2)
- **Eid al-Fitr**: Purple (#7b1fa2)
- **Eid al-Adha**: Orange (#f57c00)

### Responsive Design

- Mobile-first approach
- Grid layout adjusts for different screen sizes
- Cards stack on mobile (xs: 12, md: 6)
- Flexible header with wrapping

### Animations

- Fade transitions for alerts and previews
- Smooth border color changes
- Spin animation for loading states
- Collapse animations for conditional content

## Icons Used

- CelebrationIcon - Main header
- SettingsIcon - General settings
- SnowIcon - Christmas snow effect
- FireworksIcon - New Year fireworks
- CrescentIcon - Eid al-Fitr crescent
- LanternIcon - Eid al-Adha lantern
- SaveIcon - Save button
- RefreshIcon - Reset and loading
- CheckCircleIcon - Active season indicator

## Notifications

Uses `useNotification` context for:

- Success: Settings saved
- Info: Settings reset
- Error: Save failed (if API call fails)

## Accessibility

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus styles applied
- Logical tab order

### Screen Readers

- Descriptive labels for all controls
- Helper text for inputs
- Semantic HTML structure

### Color Contrast

- High contrast text
- Clear visual hierarchy
- Color-coded but not color-dependent

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for all screen sizes
- LocalStorage API required

## Future Enhancements

### Potential Features

1. **Live Preview**: Real-time preview of decorations
2. **Schedule Settings**: Set date ranges for each season
3. **Custom Seasons**: Add user-defined seasonal themes
4. **Animation Previews**: Show animation samples in settings
5. **Import/Export**: Share settings between instances
6. **API Integration**: Save to backend database
7. **User Permissions**: Role-based access control
8. **Decoration Library**: Choose from multiple decoration styles
9. **Color Customization**: Custom color schemes per season
10. **Sound Effects**: Optional seasonal sounds

### Auto-Detection Enhancement

Current implementation is simplified. Can be enhanced with:

- Hijri calendar integration for Islamic holidays
- Regional holiday detection
- Custom date ranges per season
- Multiple active seasons support

## Usage Example

```javascript
// Import the page
import SeasonalSettingsPage from "./pages/settings/SeasonalSettingsPage";

// Use in router
<Route path="/settings/seasonal" element={<SeasonalSettingsPage />} />;
```

## Dependencies

- React (hooks: useState, useEffect)
- Material-UI (@mui/material)
- Material-UI Icons (@mui/icons-material)
- NotificationContext (custom context)

## File Structure

```
client/src/
├── pages/
│   └── settings/
│       └── SeasonalSettingsPage.jsx
├── context/
│   └── NotificationContext.jsx
└── App.css (spin animation)
```

## Testing Checklist

### Functionality

- [ ] Master toggle enables/disables all settings
- [ ] Auto-detect toggle shows/hides manual override
- [ ] Opacity slider updates value display
- [ ] Character counters work correctly
- [ ] Save button saves to localStorage
- [ ] Reset button restores defaults
- [ ] Settings persist after page refresh
- [ ] Notifications appear correctly

### UI/UX

- [ ] Responsive on mobile, tablet, desktop
- [ ] Cards highlight when enabled
- [ ] Smooth animations and transitions
- [ ] Bottom save bar appears with changes
- [ ] Active season preview shows correctly
- [ ] Arabic text displays RTL

### Accessibility

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Color contrast sufficient

## Performance

- Minimal re-renders with proper state management
- LocalStorage operations are fast
- No unnecessary API calls
- Smooth animations with CSS

## Security

- Input validation (max length)
- XSS protection (React escapes by default)
- No sensitive data stored
- Client-side only (no backend exposure)

---

**Built with ❤️ for modern admin dashboards**
