# Logger Usage Examples

## Quick Import Guide

### Backend (Node.js)
```javascript
import logger from './utils/logger.js';
// or from any subdirectory:
import logger from '../utils/logger.js';
```

### Frontend (React)
```javascript
import logger from '../utils/logger';
// or
import { logInfo, logError, logWarn, logUserAction } from '../utils/logger';
```

## Backend Examples

### 1. User Controller
```javascript
// server/controller/user.controller.js
import logger from '../utils/logger.js';

export const createUser = async (req, res) => {
    try {
        logger.info('Creating new user', { email: req.body.email });
        
        const user = await User.create(req.body);
        
        logger.info('User created successfully', { 
            userId: user._id,
            email: user.email,
            role: user.role
        });
        
        res.status(201).json(user);
    } catch (error) {
        logger.error('Failed to create user', { 
            error: error.message,
            email: req.body.email
        });
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        logger.warn('User deleted', { 
            userId: req.params.id,
            deletedBy: req.user.id,
            email: user.email
        });
        
        res.json({ message: 'User deleted' });
    } catch (error) {
        logger.error('Failed to delete user', { 
            error: error.message,
            userId: req.params.id
        });
        res.status(500).json({ message: error.message });
    }
};
```

### 2. Authentication
```javascript
// server/controller/auth.controller.js
import logger from '../utils/logger.js';

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            logger.warn('Login attempt with non-existent email', { 
                email,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            logger.warn('Failed login - incorrect password', { 
                email,
                userId: user._id,
                ip: req.ip
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        logger.info('User logged in successfully', { 
            userId: user._id,
            email: user.email,
            ip: req.ip
        });
        
        const token = generateToken(user._id);
        res.json({ token, user });
        
    } catch (error) {
        logger.error('Login error', { 
            error: error.message,
            email
        });
        res.status(500).json({ message: 'Server error' });
    }
};
```

### 3. Database Operations
```javascript
// server/config/db.js
import logger from '../utils/logger.js';

const connectDB = async () => {
    try {
        logger.info('Attempting to connect to MongoDB...');
        
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        logger.info('MongoDB connected successfully', { 
            host: conn.connection.host,
            database: conn.connection.name
        });
        
    } catch (error) {
        logger.error('MongoDB connection failed', { 
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
};
```

### 4. Scheduled Tasks
```javascript
// server/utils/scheduler.js
import logger from './logger.js';

export const dailyBackup = () => {
    logger.info('Starting daily backup task');
    
    try {
        // Backup logic...
        logger.info('Daily backup completed successfully');
    } catch (error) {
        logger.error('Daily backup failed', { 
            error: error.message 
        });
    }
};
```

## Frontend Examples

### 1. Login Component
```javascript
// client/src/pages/auth/Login.js
import React, { useState } from 'react';
import logger from '../../utils/logger';

function Login() {
    const [email, setEmail] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        logger.userAction('Login Attempt', { email });
        
        try {
            const response = await authService.login(email, password);
            
            logger.info('Login successful', { 
                userId: response.user.id 
            });
            
            // Redirect...
            
        } catch (error) {
            logger.error('Login failed', { 
                error: error.message,
                email 
            });
            
            // Show error message...
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
        </form>
    );
}
```

### 2. Data Grid Actions
```javascript
// client/src/pages/users/UsersPage.js
import React from 'react';
import logger from '../../utils/logger';

function UsersPage() {
    const handleDelete = async (userId) => {
        logger.userAction('Delete User Clicked', { userId });
        
        try {
            await userService.deleteUser(userId);
            
            logger.info('User deleted successfully', { userId });
            
            // Update UI...
            
        } catch (error) {
            logger.error('Failed to delete user', { 
                error: error.message,
                userId 
            });
            
            // Show error...
        }
    };
    
    const handleEdit = (userId) => {
        logger.userAction('Edit User Clicked', { userId });
        // Open edit dialog...
    };
    
    return (
        <div>
            {/* DataGrid with actions */}
        </div>
    );
}
```

### 3. Form Submission
```javascript
// client/src/pages/leaves/CreateLeavePage.js
import React, { useState } from 'react';
import { logInfo, logError, logUserAction } from '../../utils/logger';

function CreateLeavePage() {
    const handleSubmit = async (formData) => {
        logUserAction('Leave Request Submitted', { 
            type: formData.type,
            startDate: formData.startDate 
        });
        
        try {
            const result = await leaveService.createLeave(formData);
            
            logInfo('Leave request created', { 
                leaveId: result.id 
            });
            
            // Show success message...
            
        } catch (error) {
            logError('Failed to create leave request', { 
                error: error.message,
                formData 
            });
            
            // Show error message...
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Form fields */}
        </form>
    );
}
```

### 4. Error Boundary
```javascript
// client/src/components/ErrorBoundary.js
import React from 'react';
import logger from '../utils/logger';

class ErrorBoundary extends React.Component {
    componentDidCatch(error, errorInfo) {
        logger.error('React Error Boundary caught error', {
            error: error.message,
            componentStack: errorInfo.componentStack
        });
    }
    
    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong.</h1>;
        }
        return this.props.children;
    }
}
```

### 5. Custom Hook
```javascript
// client/src/hooks/useApi.js
import { useState, useEffect } from 'react';
import logger from '../utils/logger';

export const useApi = (apiCall) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                logger.debug('API call started');
                
                const result = await apiCall();
                setData(result);
                
                logger.debug('API call completed successfully');
                
            } catch (err) {
                logger.error('API call failed', { 
                    error: err.message 
                });
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);
    
    return { data, loading, error };
};
```

## Tips

### 1. Use Structured Logging
```javascript
// ✅ Good - structured data
logger.info('User updated', { 
    userId: user.id, 
    changes: ['email', 'role'] 
});

// ❌ Bad - string concatenation
logger.info(`User ${user.id} updated email and role`);
```

### 2. Include Context
```javascript
// ✅ Good - includes context
logger.error('Payment failed', { 
    userId: user.id,
    amount: payment.amount,
    paymentMethod: payment.method,
    error: error.message
});

// ❌ Bad - no context
logger.error('Payment failed');
```

### 3. Use Appropriate Levels
```javascript
// Error - something broke
logger.error('Database connection lost');

// Warn - something unexpected but handled
logger.warn('User tried to access restricted page');

// Info - normal operations
logger.info('User logged in');

// Debug - detailed debugging info
logger.debug('Processing request', { data });
```

### 4. Don't Log Sensitive Data
```javascript
// ❌ Bad - logs password
logger.info('User login', { 
    email: user.email, 
    password: password 
});

// ✅ Good - no sensitive data
logger.info('User login', { 
    email: user.email 
});
```

## Testing Your Logs

### Backend
```bash
# Start your server
npm run server

# Check the logs directory
dir logs

# View today's log
type logs\2025-11-19-application.log
```

### Frontend
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform actions in your app
4. See logs appear in console
5. Check Network tab for logs sent to backend (`/api/logs`)

## Next Steps

1. Add logging to your existing controllers
2. Log important user actions in your React components
3. Monitor logs for errors and issues
4. Set up log rotation and archival for production
5. Consider integrating with a log management service (e.g., Loggly, Papertrail)
