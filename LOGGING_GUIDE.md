# Logging System Guide

This HR Management System includes a comprehensive daily logging system for both backend and frontend.

## Backend Logging (Node.js/Express)

### Features
- **Daily log rotation** - Creates new log files each day
- **Separate error logs** - Errors are logged to dedicated files
- **Automatic compression** - Old logs are zipped to save space
- **Retention policy** - Keeps logs for 14 days (30 days for errors)
- **Console output** - Colored console logs for development

### Log Files Location
All logs are stored in the `logs/` directory at the project root:
- `YYYY-MM-DD-application.log` - General application logs
- `YYYY-MM-DD-error.log` - Error logs only

### Usage in Backend Code

```javascript
import logger from './utils/logger.js';

// Info level
logger.info('User logged in', { userId: user.id, email: user.email });

// Warning level
logger.warn('Failed login attempt', { email, ip: req.ip });

// Error level
logger.error('Database connection failed', { error: err.message });

// Debug level (only in development)
logger.debug('Processing request', { data });
```

### Already Integrated
The logger is already integrated into:
- ✅ Server startup/shutdown
- ✅ All HTTP requests (method, path, IP)
- ✅ Error middleware (all errors)
- ✅ 404 Not Found errors

### Adding to Your Controllers

Example in a controller:

```javascript
import logger from '../utils/logger.js';

export const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        logger.info('User created successfully', { 
            userId: user._id, 
            email: user.email,
            createdBy: req.user.id 
        });
        res.status(201).json(user);
    } catch (error) {
        logger.error('Failed to create user', { 
            error: error.message,
            requestBody: req.body 
        });
        res.status(500).json({ message: error.message });
    }
};
```

## Frontend Logging (React)

### Features
- **Console logging** - All logs appear in browser console during development
- **Backend integration** - Important logs (errors/warnings) are sent to backend
- **Global error handler** - Catches uncaught errors and promise rejections
- **User action tracking** - Log user interactions
- **API call logging** - Automatic logging of all API requests

### Usage in React Components

```javascript
import logger from '../utils/logger';

function MyComponent() {
    const handleSubmit = async () => {
        try {
            logger.info('Form submission started');
            
            const result = await api.post('/users', data);
            
            logger.userAction('User Created', { 
                userId: result.id 
            });
            
        } catch (error) {
            logger.error('Form submission failed', { 
                error: error.message 
            });
        }
    };
    
    return <button onClick={handleSubmit}>Submit</button>;
}
```

### Available Methods

```javascript
// Basic logging
logger.info('Information message', { optional: 'metadata' });
logger.warn('Warning message', { optional: 'metadata' });
logger.error('Error message', { optional: 'metadata' });
logger.debug('Debug message', { optional: 'metadata' }); // Dev only

// User actions
logger.userAction('Button Clicked', { buttonId: 'submit' });

// API calls (already integrated in api.js)
logger.apiCall('POST', '/api/users', 201);
logger.apiCall('GET', '/api/users', 500, new Error('Failed'));
```

### Already Integrated
The logger is already integrated into:
- ✅ Application startup
- ✅ Global error handler (uncaught errors)
- ✅ All API requests/responses (via axios interceptors)
- ✅ Network errors
- ✅ Authentication errors

## Configuration

### Backend Environment Variables

Add to your `.env` file:

```env
LOG_LEVEL=info  # Options: error, warn, info, debug
NODE_ENV=development  # or production
```

### Frontend Environment Variables

Add to `client/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

## Log Levels

1. **error** - Critical errors that need immediate attention
2. **warn** - Warning messages for potentially harmful situations
3. **info** - General informational messages
4. **debug** - Detailed debugging information (dev only)

## Best Practices

### When to Log

✅ **DO log:**
- User authentication events (login, logout, failed attempts)
- Data modifications (create, update, delete)
- API errors and failures
- Security-related events
- Important business logic decisions
- Performance issues

❌ **DON'T log:**
- Sensitive data (passwords, tokens, credit cards)
- Personal information in production
- Every single function call (too verbose)
- Inside tight loops

### Example: Login Controller

```javascript
export const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const user = await User.findOne({ email });
        
        if (!user) {
            logger.warn('Login attempt with non-existent email', { 
                email, 
                ip: req.ip 
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            logger.warn('Failed login attempt - wrong password', { 
                email, 
                ip: req.ip 
            });
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        logger.info('User logged in successfully', { 
            userId: user._id, 
            email: user.email,
            ip: req.ip 
        });
        
        // Generate token and send response...
        
    } catch (error) {
        logger.error('Login error', { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ message: 'Server error' });
    }
};
```

## Viewing Logs

### Backend Logs
```bash
# View today's application log
type logs\2025-11-19-application.log

# View today's error log
type logs\2025-11-19-error.log

# Watch logs in real-time (PowerShell)
Get-Content logs\2025-11-19-application.log -Wait -Tail 50
```

### Frontend Logs
- Open browser DevTools (F12)
- Go to Console tab
- Filter by log level if needed

## Maintenance

The logging system automatically:
- Creates new log files daily
- Compresses old logs (saves ~90% space)
- Deletes logs older than retention period
- Creates the logs directory if it doesn't exist

No manual maintenance required!

## Troubleshooting

### Logs not appearing?

1. Check if `logs/` directory exists
2. Verify LOG_LEVEL in .env
3. Check file permissions
4. Look for errors in console

### Frontend logs not reaching backend?

1. Verify REACT_APP_API_URL is correct
2. Check CORS settings
3. Verify `/api/logs` endpoint is accessible
4. Check browser network tab for failed requests

## Security Notes

- Never log sensitive data (passwords, tokens, etc.)
- In production, consider sending logs to a centralized logging service
- Regularly review logs for security incidents
- Ensure log files have appropriate permissions
- Consider encrypting logs containing sensitive information
