# Quick Start Guide - HR Management System Frontend

## 🚀 Getting Started

### Prerequisites

- Node.js 14+ installed
- npm or yarn package manager
- Backend API running (optional for development)

### Installation

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### Running the Application

```bash
# Start development server
npm start

# Application will open at http://localhost:3000
```

---

## 🔐 Login Credentials

### Test Users (Configure in backend)

**Admin User:**

- Email: admin@example.com
- Password: admin123
- Role: admin

**HR User:**

- Email: hr@example.com
- Password: hr123
- Role: hr

**Employee User:**

- Email: employee@example.com
- Password: emp123
- Role: employee

---

## 📱 Application Structure

### Main Routes

| Route            | Description            | Access                  |
| ---------------- | ---------------------- | ----------------------- |
| `/login`         | Login page             | Public                  |
| `/dashboard`     | Main dashboard         | All authenticated users |
| `/users`         | User management        | Admin only              |
| `/schools`       | Schools management     | HR, Admin               |
| `/departments`   | Departments management | HR, Admin               |
| `/positions`     | Positions management   | HR, Admin               |
| `/attendance`    | Attendance tracking    | All roles               |
| `/leaves`        | Leave management       | All roles               |
| `/permissions`   | Permission requests    | All roles               |
| `/requests`      | General requests       | All roles               |
| `/payroll`       | Payroll management     | HR, Admin               |
| `/documents`     | Document management    | All roles               |
| `/templates`     | Document templates     | HR, Admin               |
| `/announcements` | Announcements          | All roles               |
| `/events`        | Events calendar        | All roles               |
| `/surveys`       | Surveys                | All roles               |
| `/holidays`      | Holiday calendar       | HR, Admin               |
| `/vacations`     | Vacation management    | HR, Admin               |
| `/reports`       | Report generation      | HR, Admin               |
| `/analytics`     | Analytics dashboard    | Admin                   |
| `/security`      | Security settings      | Admin                   |
| `/backups`       | Backup management      | Admin                   |
| `/resigned`      | Resigned employees     | HR, Admin               |

---

## 🎯 Feature Overview

### For Employees

1. **Dashboard** - View personal statistics
2. **Attendance** - Track your attendance
3. **Leaves** - Submit leave requests
4. **Permissions** - Request permissions
5. **Requests** - Submit general requests
6. **Documents** - View and download documents
7. **Announcements** - Read company announcements
8. **Events** - View upcoming events
9. **Surveys** - Participate in surveys

### For HR Staff

All Employee features plus:

1. **Organization** - Manage schools, departments, positions
2. **Attendance** - Track all employee attendance
3. **Approvals** - Approve/reject leave and permission requests
4. **Payroll** - Process employee payroll
5. **Documents** - Manage company documents
6. **Templates** - Create document templates
7. **Communication** - Create announcements and events
8. **Surveys** - Create and manage surveys
9. **Holidays** - Manage holiday calendar
10. **Vacations** - Track vacation balances
11. **Reports** - Generate HR reports
12. **Resigned** - Track resigned employees

### For Administrators

All HR features plus:

1. **Users** - Manage system users
2. **Analytics** - View system analytics
3. **Security** - Configure security settings
4. **Backups** - Manage system backups
5. **Full Access** - Complete system control

---

## 🛠️ Development

### Project Structure

```
client/
├── public/              # Static files
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components (23 pages)
│   ├── services/       # API services (24 services)
│   ├── context/        # React Context providers
│   ├── hooks/          # Custom React hooks
│   ├── routes/         # Route configuration
│   ├── theme/          # Material-UI theme
│   ├── App.js          # Main app component
│   └── index.js        # Entry point
├── package.json        # Dependencies
└── .env               # Environment variables
```

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests (when implemented)
npm test

# Eject from Create React App (not recommended)
npm run eject
```

### Adding New Features

1. **Create a new page:**

   ```bash
   mkdir src/pages/newfeature
   touch src/pages/newfeature/NewFeaturePage.jsx
   ```

2. **Create a service:**

   ```bash
   touch src/services/newfeature.service.js
   ```

3. **Add route in App.js:**

   ```javascript
   import NewFeaturePage from "./pages/newfeature/NewFeaturePage";

   // In routes:
   <Route path="newfeature" element={<NewFeaturePage />} />;
   ```

4. **Add to sidebar navigation:**
   Edit `src/components/DashboardSidebar.jsx`

---

## 🎨 Customization

### Theme Customization

Edit `src/theme/customizations.js`:

```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Change primary color
    },
    secondary: {
      main: "#dc004e", // Change secondary color
    },
  },
  typography: {
    fontFamily: "Roboto, Arial, sans-serif",
  },
});
```

### Logo and Branding

1. Replace logo in `public/logo.png`
2. Update `public/index.html` title
3. Update `public/manifest.json`

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "Module not found" error**

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: "Port 3000 is already in use"**

```bash
# Solution: Use different port
PORT=3001 npm start
```

**Issue: API connection failed**

```bash
# Solution: Check backend is running and .env is configured
# Verify REACT_APP_API_URL in .env
```

**Issue: Login not working**

```bash
# Solution: Check backend API is running
# Verify credentials
# Check browser console for errors
```

### Debug Mode

Enable debug logging:

```javascript
// In src/services/api.js
axios.interceptors.request.use((request) => {
  console.log("Starting Request", request);
  return request;
});
```

---

## 📦 Building for Production

### Build Steps

```bash
# 1. Update environment variables
# Edit .env for production API URL

# 2. Build the application
npm run build

# 3. Test the build locally
npm install -g serve
serve -s build

# 4. Deploy to hosting service
# Upload build/ folder to your hosting provider
```

### Environment Variables for Production

```bash
REACT_APP_API_URL=https://api.yourcompany.com/api
REACT_APP_ENV=production
```

### Deployment Options

1. **Netlify:**

   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

2. **Vercel:**

   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **AWS S3 + CloudFront:**

   ```bash
   aws s3 sync build/ s3://your-bucket-name
   ```

4. **Docker:**
   ```dockerfile
   FROM node:14-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   CMD ["npm", "start"]
   ```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Login with all three roles
- [ ] Navigate through all pages
- [ ] Create, edit, delete records
- [ ] Test approval workflows
- [ ] Verify role-based access
- [ ] Check responsive design
- [ ] Test error handling
- [ ] Verify notifications

### Automated Testing (To be implemented)

```bash
# Unit tests
npm test

# Coverage report
npm test -- --coverage

# E2E tests
npm run test:e2e
```

---

## 📚 Additional Resources

### Documentation

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)

### Project Documentation

- `FRONTEND_IMPLEMENTATION_STATUS.md` - Implementation progress
- `FRONTEND_COMPLETE_SUMMARY.md` - Complete feature list
- `COMMIT_SUMMARY.md` - Git commit guide

---

## 🆘 Support

### Getting Help

1. Check the documentation files
2. Review console errors in browser DevTools
3. Check network tab for API errors
4. Verify backend API is running
5. Check environment variables

### Common Commands

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Update dependencies
npm update

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit
npm audit fix
```

---

## ✅ Checklist for New Developers

- [ ] Clone the repository
- [ ] Install Node.js and npm
- [ ] Run `npm install`
- [ ] Create `.env` file
- [ ] Start backend API
- [ ] Run `npm start`
- [ ] Login with test credentials
- [ ] Explore all pages
- [ ] Read documentation files
- [ ] Review code structure
- [ ] Make a test change
- [ ] Commit and push

---

**Version:** 1.0.0  
**Last Updated:** November 10, 2025  
**Status:** Production Ready

🎉 **Happy Coding!** 🎉
