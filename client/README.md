# HR-SM Client Application

Professional Human Resources Management System - Frontend Application

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
client/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   │   ├── common/      # Reusable components
│   │   ├── Dashboard*.jsx
│   │   └── ...
│   ├── pages/          # Page components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   └── ...
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API services
│   ├── theme/          # Theme configuration
│   ├── utils/          # Utility functions
│   ├── constants/      # Constants and configs
│   ├── App.js          # Main app component
│   └── index.js        # Entry point
├── STYLE_GUIDE.md      # Design system documentation
└── package.json
```

## 🎨 Design System

### Theme
- **Primary**: Blue (#2563eb)
- **Secondary**: Purple (#7c3aed)
- **Font**: Inter, Roboto, Helvetica, Arial
- **Spacing**: 8px base unit
- **Border Radius**: 8-16px

See [STYLE_GUIDE.md](./STYLE_GUIDE.md) for complete design system documentation.

## 🧩 Component Library

### Common Components

#### Layout
- `PageContainer` - Page layout wrapper
- `StyledCard` - Enhanced card component
- `DashboardHeader` - Application header
- `DashboardSidebar` - Navigation sidebar

#### Data Display
- `DataTable` - Professional data table
- `StatsCard` - Statistics card
- `StatusChip` - Status indicator
- `EmptyState` - Empty state UI

#### User Input
- `SearchBar` - Search input
- `FilterBar` - Multi-filter component

#### Feedback
- `Loading` - Loading spinner
- `ConfirmDialog` - Confirmation dialog
- `Notification` - Toast notifications

#### Actions
- `ActionMenu` - Dropdown action menu

See [components/common/README.md](./src/components/common/README.md) for detailed documentation.

## 🪝 Custom Hooks

```javascript
import { useDebounce, useLocalStorage, useToggle } from './hooks';

// Debounce values
const debouncedSearch = useDebounce(searchTerm, 500);

// Persist state in localStorage
const [theme, setTheme] = useLocalStorage('theme', 'light');

// Toggle boolean values
const [isOpen, toggle, open, close] = useToggle(false);
```

## 🛠️ Utility Functions

### Formatters
```javascript
import { formatDate, formatCurrency, formatFileSize } from './utils';

formatDate(new Date()); // "Jan 1, 2024"
formatCurrency(1234.56); // "$1,234.56"
formatFileSize(1024); // "1 KB"
```

### Validators
```javascript
import { isValidEmail, validatePassword } from './utils';

isValidEmail('test@example.com'); // true
validatePassword('MyPass123!'); // { isValid: true, strength: 'strong' }
```

### Helpers
```javascript
import { debounce, sortByKey, copyToClipboard } from './utils';

const debouncedFn = debounce(handleSearch, 300);
const sorted = sortByKey(users, 'name', 'asc');
await copyToClipboard('text to copy');
```

## 🎯 Features

### Authentication
- Login/Logout
- Role-based access control (Admin, HR, Employee)
- Protected routes

### User Management
- CRUD operations for users
- Role assignment
- Profile management

### HR Operations
- Attendance tracking
- Leave management
- Permission requests
- Payroll management

### Documents
- Document upload/download
- Document categorization
- Access control

### Communication
- Announcements
- Events
- Surveys

### Reporting
- Analytics dashboard
- Custom reports
- Data export

## 🌓 Dark Mode

The application fully supports dark mode. Toggle between light and dark themes using the theme switcher in the header.

## 📱 Responsive Design

The application is fully responsive and works on:
- Mobile devices (< 600px)
- Tablets (600px - 900px)
- Desktops (> 900px)

## ♿ Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader friendly
- Proper ARIA labels
- Focus indicators

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 🏗️ Building for Production

```bash
# Create production build
npm run build

# The build folder will contain optimized files
```

## 📦 Dependencies

### Core
- React 19.2.0
- React Router 7.9.5
- Material-UI 7.3.4

### Utilities
- Axios (HTTP client)
- Day.js (Date manipulation)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the client directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## 📝 Code Style

- ESLint for linting
- Prettier for formatting
- Component naming: PascalCase
- File naming: PascalCase for components
- Function naming: camelCase

## 🤝 Contributing

1. Follow the style guide
2. Write tests for new features
3. Update documentation
4. Use meaningful commit messages

## 📄 License

Copyright © 2025 HR-SM. All rights reserved.

## 🆘 Support

For issues and questions:
- Check the [Style Guide](./STYLE_GUIDE.md)
- Review [Component Documentation](./src/components/common/README.md)
- Contact the development team

## 🎉 Credits

Built with ❤️ using:
- React
- Material-UI
- Inter Font
- And many other amazing open-source projects
