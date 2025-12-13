# Platform Theme System

## Overview
The HRMS Platform uses a distinctive purple color scheme that differentiates it from the HR-core application while maintaining the same design system structure. This provides visual distinction for platform administration while ensuring consistency in layout, typography, and component behavior.

## Features

### 🎨 Theme Modes
- **Light Theme**: Clean and bright interface for daytime use (default)
- **Dark Theme**: Easy on the eyes for low-light environments
- **Synchronized Design**: Matches HR-core application styling

### 🔧 Theme System Components

#### 1. Core Theme (`platformTheme.js`)
- **Color Palette**: Comprehensive color system with 50-900 shades
- **Typography**: Inter font family with optimized font weights and sizes
- **Component Overrides**: Customized Material-UI components
- **Responsive Design**: Mobile-first approach with consistent spacing

#### 2. Theme Context (`ThemeContext.jsx`)
- **Mode Switching**: Toggle between light and dark modes
- **Persistence**: Theme preference saved to localStorage
- **Material-UI Integration**: Uses Material-UI's CSS variables system
- **HR-core Compatibility**: Maintains consistency with main application

#### 3. Theme Settings Component (`ThemeSettings.jsx`)
- **Mode Selector**: Switch between light and dark modes
- **Theme Information**: Shows current theme details
- **HR-core Integration**: Links to main application for advanced customization
- **Reset Functionality**: Return to light theme

### 🎯 Implementation

#### Theme Provider Setup
```jsx
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <CssBaseline enableColorScheme />
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

#### Using Theme in Components
```jsx
import { useTheme } from '../contexts/ThemeContext';

const MyComponent = () => {
  const { theme, currentTheme, toggleColorMode } = useTheme();
  
  return (
    <Box sx={{ backgroundColor: 'background.default' }}>
      Current mode: {currentTheme}
      <Button onClick={toggleColorMode}>
        Toggle Theme
      </Button>
    </Box>
  );
};
```

### 🎨 Platform Color System (Purple Theme)

#### Light Mode Colors
- **Primary Purple**: #8b5cf6 (distinctive purple for platform branding)
- **Secondary Slate**: #64748b (slate gray for subtle elements)
- **Success Emerald**: #10b981 (emerald green for success states)
- **Warning Orange**: #f59e0b (orange for warnings)
- **Error Red**: #ef4444 (red for errors)
- **Info Cyan**: #06b6d4 (cyan for informational messages)

#### Dark Mode Colors
- **Primary Purple**: #a78bfa (lighter purple for dark backgrounds)
- **Secondary Slate**: #94a3b8 (lighter slate for dark mode)
- **Success Emerald**: #34d399 (lighter emerald for dark mode)
- **Warning Orange**: #fbbf24 (lighter orange for dark mode)
- **Error Red**: #f87171 (lighter red for dark mode)
- **Info Cyan**: #22d3ee (lighter cyan for dark mode)

### 🔧 Component Customizations

#### Cards
- **Border Radius**: 12px for modern look
- **Hover Effects**: Smooth elevation changes
- **Border**: Subtle 1px borders instead of heavy shadows

#### Buttons
- **Border Radius**: 8px
- **Text Transform**: None (preserves original casing)
- **Font Weight**: 500 (medium)
- **Hover Effects**: Subtle shadow elevation

#### Navigation
- **Selected States**: Primary color backgrounds
- **Hover States**: Light gray backgrounds
- **Icons**: Consistent sizing and colors

### 📱 Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Standard Material-UI breakpoints
- **Spacing**: Consistent 8px grid system
- **Typography**: Responsive font sizes

### 🌙 Dark Mode Support
- **Material-UI CSS Variables**: Uses native Material-UI color scheme system
- **Automatic Adaptation**: All components automatically adapt to dark mode
- **Optimized Contrast**: Colors adjusted for optimal readability in both modes
- **Persistence**: Theme preference remembered across sessions
- **HR-core Synchronization**: Matches the main application's dark mode behavior

### 🚀 Usage Examples

#### Theme Mode Switching
```jsx
const { toggleColorMode, changeTheme, currentTheme } = useTheme();

// Toggle between light and dark
toggleColorMode();

// Set specific mode
changeTheme('dark');
changeTheme('light');

// Current mode
console.log(currentTheme); // 'light' or 'dark'
```

#### Using Material-UI Color Variables
```jsx
// Use CSS variables for automatic theme adaptation
<Box sx={{
  backgroundColor: 'primary.main',
  color: 'primary.contrastText',
  borderRadius: 'shape.borderRadius',
}}>
  Themed content that adapts automatically
</Box>
```

### 🎯 Accessing Theme Settings
1. **Navigation**: Go to System → Theme Settings
2. **Quick Switch**: Use the palette icon in the top navigation
3. **Keyboard**: Themes are instantly applied when selected

### 🔮 Future Enhancements
- **HR-core Theme Sync**: Real-time synchronization with main application themes
- **Company Branding**: Per-tenant theme customization (managed from HR-core)
- **Advanced Customization**: Access to HR-core's theme editor for detailed customization
- **Theme Inheritance**: Automatic adoption of HR-core theme changes
- **Multi-tenant Themes**: Different themes per company/tenant

### 📁 File Structure
```
client/platform-admin/src/
├── theme/
│   └── platformTheme.js          # Core theme configuration
├── contexts/
│   └── ThemeContext.jsx          # Theme management context
├── components/
│   └── theme/
│       └── ThemeSettings.jsx     # Theme settings interface
└── App.js                        # Theme provider setup
```

### 🎨 Design Principles
- **Visual Distinction**: Purple color scheme differentiates platform from HR-core
- **Structural Consistency**: Same design system structure as HR-core for familiarity
- **Material-UI Standards**: Follows Material Design guidelines and best practices
- **Accessibility**: WCAG compliant color contrasts in both light and dark modes
- **Performance**: Leverages Material-UI's CSS variables for efficient theme switching
- **Administrative Identity**: Purple theme reinforces platform's administrative role

The platform theme system provides clear visual distinction for administrative functions while maintaining familiar design patterns and ensuring accessibility across all user interfaces.