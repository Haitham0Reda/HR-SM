# HR Management Dashboard - Client Application

A modern, accessible React application for HR management with a comprehensive design system, seasonal effects, and performance optimizations.

## 📚 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Design System](#design-system)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Development](#development)
- [Testing](#testing)
- [Performance](#performance)
- [Accessibility](#accessibility)
- [Documentation](#documentation)

## ✨ Features

### Core Functionality
- **User Management**: Complete CRUD operations for users with role-based access
- **Department Management**: Organize users by departments and positions
- **Attendance Tracking**: Check-in/check-out system with work hour calculations
- **Leave Management**: Annual, casual, and sick leave tracking with approval workflows
- **Permission Requests**: Late arrival, early departure, overtime, and mission requests
- **Document Management**: Upload and manage employee documents
- **Announcements**: System-wide announcements and notifications
- **Events & Holidays**: Calendar management for company events and holidays
- **Reports & Analytics**: Comprehensive reporting and data visualization
- **Settings**: Customizable system settings and configurations

### Design System
- **Unified Components**: Consistent UI components across the application
- **Design Tokens**: Centralized design values for colors, spacing, typography
- **Theme Support**: Light and dark mode with smooth transitions
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support

### Advanced Features
- **Seasonal Effects**: Animated seasonal decorations (Christmas, New Year, Eid)
- **Performance Optimizations**: Code splitting, lazy loading, memoization
- **Bulk Operations**: Bulk user upload via Excel files
- **Real-time Updates**: Live notifications and data updates
- **Storybook Integration**: Component development and documentation

## 🛠️ Technology Stack

- **React 19.2**: Modern React with hooks and concurrent features
- **Material-UI v6**: Component library with custom theming
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API requests
- **Day.js**: Date manipulation and formatting
- **XLSX**: Excel file processing for bulk uploads
- **Recharts**: Data visualization and charts
- **Storybook**: Component development and documentation
- **Jest & React Testing Library**: Unit and integration testing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend server running (see root README)

### Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:3000`

### Build for Production

```bash
# Create optimized production build
npm run build

# The build folder will contain the production-ready files
```

## 🎨 Design System

The application uses a comprehensive design system for consistency and maintainability.

### Quick Start

```jsx
import { Button, TextField, Card } from './components/common';
import { StatCard, ActionCard } from './components/composite';
import { designTokens } from './theme/designTokens';

// Use design tokens
<Box sx={{ 
  p: designTokens.spacing.lg,
  borderRadius: designTokens.borderRadius.lg 
}}>
  <Button variant="contained" color="primary">
    Click Me
  </Button>
</Box>
```

### Documentation

- **[Getting Started](./src/DESIGN_SYSTEM_GETTING_STARTED.md)**: Introduction and quick start
- **[Components Reference](./src/DESIGN_SYSTEM_COMPONENTS.md)**: Complete component documentation
- **[Design Tokens](./src/DESIGN_SYSTEM_TOKENS.md)**: Colors, spacing, typography reference
- **[Common Patterns](./src/DESIGN_SYSTEM_PATTERNS.md)**: Best practices and UI patterns
- **[Extension Guide](./src/DESIGN_SYSTEM_EXTENSION_GUIDE.md)**: Adding new components

## 📁 Project Structure

```
client/
├── public/                      # Static assets
├── src/
│   ├── components/
│   │   ├── common/             # Base components (Button, TextField, etc.)
│   │   ├── composite/          # Composite components (StatCard, ActionCard, etc.)
│   │   ├── templates/          # Page templates (ListPage, FormPage, etc.)
│   │   ├── seasonal/           # Seasonal effects components
│   │   ├── DashboardLayout.jsx # Main layout
│   │   └── PageContainer.jsx   # Page wrapper
│   ├── pages/                  # Application pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── users/              # User management
│   │   ├── departments/        # Department management
│   │   ├── attendance/         # Attendance tracking
│   │   ├── permissions/        # Permission requests
│   │   ├── leaves/             # Leave management
│   │   └── settings/           # Settings pages
│   ├── context/                # React context providers
│   ├── hooks/                  # Custom React hooks
│   ├── theme/                  # Design tokens and theme configuration
│   ├── utils/                  # Utility functions
│   ├── testing/                # Test utilities
│   ├── App.js                  # Main application component
│   └── index.js                # Application entry point
├── .storybook/                 # Storybook configuration
├── package.json
└── README.md
```

## 🎯 Key Features

### 1. Unified Design System

A comprehensive design system with:
- **50+ reusable components** organized in three layers (base, composite, templates)
- **Design tokens** for colors, spacing, typography, shadows, and more
- **Light and dark mode** support with automatic theme switching
- **Responsive design** with mobile-first approach
- **Accessibility** built-in with WCAG 2.1 AA compliance

### 2. Seasonal Effects System

Animated seasonal decorations with:
- **Christmas**: Falling snowflakes
- **New Year**: Fireworks animation
- **Eid al-Fitr**: Floating crescent moon
- **Eid al-Adha**: Rising lanterns
- **Auto-detection** based on current date
- **Manual override** for testing and special occasions
- **Customizable settings** with opacity control and mobile support

See [Seasonal Effects Documentation](../docs/SEASONAL_EFFECTS_SYSTEM.md)

### 3. Bulk User Upload

Upload multiple users via Excel files:
- **Template download** with example data
- **Comprehensive validation** for all fields
- **Partial success** handling (valid rows processed even if some fail)
- **Detailed error reporting** for failed rows
- **Support for all user fields** including vacation balances

See [Bulk Upload Documentation](../docs/BULK_USER_UPLOAD.md)

### 4. Performance Optimizations

Optimized for speed and efficiency:
- **Code splitting** with React.lazy() for route-based loading
- **Component memoization** with React.memo() to prevent unnecessary re-renders
- **Hook optimization** with useMemo() and useCallback()
- **Context optimization** with memoized values
- **Lazy image loading** with Intersection Observer
- **Debouncing and throttling** for search and scroll events

**Results**: 60% reduction in initial bundle size, 44% faster Time to Interactive

### 5. Accessibility Features

Built with accessibility in mind:
- **WCAG 2.1 AA compliant** color contrast ratios
- **Keyboard navigation** for all interactive elements
- **Screen reader support** with proper ARIA labels
- **Focus management** with visible indicators
- **Form accessibility** with proper labels and error messages
- **Automated testing** with jest-axe

### 6. Storybook Integration

Component development and documentation:
- **Interactive component playground** for all design system components
- **Visual testing** with Chromatic integration
- **Documentation** with MDX stories
- **Accessibility checks** built into stories

Run Storybook:
```bash
npm run storybook
```

## 💻 Development

### Available Scripts

```bash
# Development
npm start              # Start development server
npm run build          # Create production build
npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report

# Storybook
npm run storybook      # Start Storybook
npm run build-storybook # Build Storybook for deployment

# Code Quality
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Environment Variables

Create a `.env` file in the client directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### Development Workflow

1. **Create a new feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Use the design system**
   - Check existing components before creating new ones
   - Use design tokens for all styling
   - Follow established patterns

3. **Test your changes**
   ```bash
   npm test
   ```

4. **Check accessibility**
   - Test keyboard navigation
   - Run automated accessibility tests
   - Check color contrast

5. **Create a pull request**
   - Include screenshots
   - Document any new components
   - Update relevant documentation

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- Dashboard.test.js

# Run with coverage
npm run test:coverage
```

### Accessibility Testing

```bash
# Run accessibility tests
npm test -- accessibility.test.js
```

### Visual Regression Testing

Using Chromatic for visual testing:

```bash
# Run visual tests
npm run chromatic
```

### Cross-Browser Testing

Test in multiple browsers:
- Chrome (primary development browser)
- Firefox
- Safari
- Edge

## ⚡ Performance

### Optimization Techniques

1. **Code Splitting**: Routes are lazy-loaded to reduce initial bundle size
2. **Memoization**: Components and values are memoized to prevent unnecessary re-renders
3. **Image Optimization**: Images are lazy-loaded and optimized
4. **Bundle Analysis**: Regular analysis to identify and remove unused code

### Performance Metrics

- **Initial Bundle Size**: ~300KB (gzipped)
- **Time to Interactive**: ~2.5s on 3G
- **Lighthouse Score**: 90+
- **First Contentful Paint**: <1.5s

### Monitoring

Use Chrome DevTools and Lighthouse to monitor:
- Bundle size
- Load times
- Core Web Vitals (LCP, FID, CLS)
- Memory usage

## ♿ Accessibility

### Standards

- **WCAG 2.1 Level AA** compliance
- **Keyboard navigation** for all interactive elements
- **Screen reader compatibility** with proper ARIA labels
- **Color contrast** ratios meet minimum requirements
- **Focus indicators** visible on all focusable elements

### Testing Tools

- **axe DevTools**: Automated accessibility testing
- **WAVE**: Visual accessibility evaluation
- **Lighthouse**: Comprehensive accessibility audits
- **NVDA/VoiceOver**: Screen reader testing

### Accessibility Checklist

- [ ] All images have alt text
- [ ] All buttons have labels
- [ ] Form inputs have labels
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] ARIA labels are present
- [ ] Screen reader compatible

## 📖 Documentation

### Design System Documentation

- **[Design System README](./src/DESIGN_SYSTEM_README.md)**: Overview and index
- **[Getting Started](./src/DESIGN_SYSTEM_GETTING_STARTED.md)**: Quick start guide
- **[Components](./src/DESIGN_SYSTEM_COMPONENTS.md)**: Complete component reference
- **[Design Tokens](./src/DESIGN_SYSTEM_TOKENS.md)**: Token reference
- **[Patterns](./src/DESIGN_SYSTEM_PATTERNS.md)**: Common UI patterns
- **[Extension Guide](./src/DESIGN_SYSTEM_EXTENSION_GUIDE.md)**: Adding new components

### Feature Documentation

- **[Bulk User Upload](../docs/BULK_USER_UPLOAD.md)**: Excel upload feature
- **[Seasonal Effects](../docs/SEASONAL_EFFECTS_SYSTEM.md)**: Seasonal decorations
- **[Seasonal Settings](../docs/SEASONAL_SETTINGS_PAGE.md)**: Settings page

### Migration Documentation

- **[Migration Guide](./src/MIGRATION_GUIDE.md)**: Step-by-step migration instructions
- **[Migration Audit](./src/MIGRATION_AUDIT.md)**: Page inventory and priorities
- **[Migration Summary](./src/MIGRATION_SUMMARY.md)**: Project status and metrics
- **[Migration Index](./src/MIGRATION_INDEX.md)**: Documentation index
- **[Quick Reference](./src/MIGRATION_QUICK_REFERENCE.md)**: Cheat sheet

## 🤝 Contributing

### Guidelines

1. **Follow the design system** - Use existing components and tokens
2. **Write tests** - Maintain test coverage above 80%
3. **Document changes** - Update relevant documentation
4. **Check accessibility** - Ensure WCAG AA compliance
5. **Test responsively** - Verify on mobile, tablet, and desktop

### Code Style

- Use ESLint and Prettier for code formatting
- Follow React best practices
- Use functional components with hooks
- Write meaningful commit messages

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:

1. Check the documentation
2. Search existing issues
3. Create a new issue with details
4. Contact the development team

---

**Built with ❤️ for modern HR management**
