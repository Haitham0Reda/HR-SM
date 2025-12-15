# Contributing to HRMS Platform

Thank you for your interest in contributing to the HRMS Platform! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **🐛 Bug Reports**: Help us identify and fix issues
- **💡 Feature Requests**: Suggest new features or improvements
- **📝 Documentation**: Improve or add to our documentation
- **🔧 Code Contributions**: Fix bugs or implement new features
- **🧪 Testing**: Help improve test coverage
- **🎨 UI/UX Improvements**: Enhance user experience

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/HR-SM.git
cd HR-SM

# Add upstream remote
git remote add upstream https://github.com/original-repo/HR-SM.git
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install
cd client && npm run install:all && cd ..

# Set up environment files
cp .env.example .env
cp client/hr-app/.env.example client/hr-app/.env
cp client/platform-admin/.env.example client/platform-admin/.env

# Start development servers
npm run dev
```

### 3. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

## 📝 Development Guidelines

### Code Style

- **JavaScript/Node.js**: Follow existing ES6+ patterns
- **React**: Use functional components with hooks
- **CSS**: Use consistent naming conventions
- **Comments**: Write clear, concise comments for complex logic
- **File Organization**: Follow the existing modular structure

### Naming Conventions

```javascript
// Variables and functions: camelCase
const userName = 'john_doe';
const getUserData = () => {};

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:5000';

// Components: PascalCase
const UserProfile = () => {};

// Files: kebab-case for utilities, PascalCase for components
user-utils.js
UserProfile.jsx
```

### Module Structure

When adding new modules, follow this structure:

```
server/modules/your-module/
├── controllers/
│   └── yourModuleController.js
├── models/
│   └── YourModel.js
├── routes/
│   └── yourModuleRoutes.js
├── services/
│   └── yourModuleService.js
├── __tests__/
│   └── yourModule.test.js
└── index.js
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- server/modules/tasks/__tests__/task.test.js

# Run tests in watch mode
npm run test:watch
```

### Writing Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and module interactions
- **Property-Based Tests**: Use for complex business logic

Example test structure:

```javascript
import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../../../app.js";
import { setupTestDB, teardownTestDB } from "../../testing/setup.js";

describe("Your Module API", () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  test("should perform expected behavior", async () => {
    // Test implementation
  });
});
```

## 📋 Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] Code follows project conventions
- [ ] Documentation is updated if needed
- [ ] No console.log statements left behind
- [ ] Changes are tested manually
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review code for quality and standards
3. **Testing**: Changes are tested in development environment
4. **Approval**: At least one maintainer approval required
5. **Merge**: Changes are merged into main branch

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Check documentation** for known limitations
3. **Test with latest version** to ensure bug still exists

### Bug Report Template

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.0, Ubuntu 20.04]
- Node.js Version: [e.g. 18.17.0]
- MongoDB Version: [e.g. 6.0.5]
- Browser: [e.g. Chrome 120, Firefox 121]

**Additional Context**
Add any other context about the problem here.
```

## 💡 Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation Ideas**
If you have ideas about how this could be implemented, please share them.
```

## 📚 Documentation

### Documentation Standards

- **Clear and Concise**: Write for developers of all skill levels
- **Examples**: Include code examples where helpful
- **Up-to-Date**: Keep documentation current with code changes
- **Structured**: Use consistent formatting and organization

### Documentation Locations

- **README.md**: Main project overview and quick start
- **docs/**: Detailed documentation and guides
- **Code Comments**: Inline documentation for complex logic
- **API Documentation**: Complete API reference

## 🏷️ Issue Labels

We use labels to categorize issues:

- **bug**: Something isn't working
- **enhancement**: New feature or request
- **documentation**: Improvements or additions to documentation
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed
- **question**: Further information is requested
- **wontfix**: This will not be worked on

## 🎯 Coding Standards

### JavaScript/Node.js

```javascript
// Use const/let instead of var
const apiUrl = process.env.API_URL;
let userCount = 0;

// Use arrow functions for short functions
const getUserId = (user) => user.id;

// Use async/await instead of callbacks
const fetchUser = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw error;
  }
};

// Use destructuring
const { firstName, lastName, email } = user;

// Use template literals
const message = `Welcome ${firstName} ${lastName}!`;
```

### React Components

```jsx
// Use functional components with hooks
import React, { useState, useEffect } from 'react';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.firstName} {user.lastName}</h2>
      <p>{user.email}</p>
    </div>
  );
};

export default UserProfile;
```

## 🔒 Security Guidelines

### Security Best Practices

- **Input Validation**: Always validate and sanitize user input
- **Authentication**: Use proper JWT token handling
- **Authorization**: Implement proper role-based access control
- **Secrets**: Never commit secrets or API keys
- **Dependencies**: Keep dependencies updated and secure

### Reporting Security Issues

**DO NOT** create public issues for security vulnerabilities. Instead:

1. Email security@hrms-platform.com
2. Include detailed description of the vulnerability
3. Provide steps to reproduce if possible
4. Allow time for the issue to be addressed before public disclosure

## 📞 Getting Help

### Community Support

- **GitHub Discussions**: Ask questions and share ideas
- **Discord**: Real-time chat with community members
- **Documentation**: Check our comprehensive docs first

### Maintainer Contact

- **General Questions**: Open a GitHub discussion
- **Urgent Issues**: Email support@hrms-platform.com
- **Security Issues**: Email security@hrms-platform.com

## 📄 License

By contributing to HRMS Platform, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors are recognized in several ways:

- **Contributors List**: Added to project contributors
- **Release Notes**: Mentioned in release notes for significant contributions
- **Hall of Fame**: Featured on project website (for major contributions)

Thank you for contributing to HRMS Platform! 🎉