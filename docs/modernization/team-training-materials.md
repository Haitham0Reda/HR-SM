# HR-SM Modernization Team Training Materials

## Training Overview

This document provides comprehensive training materials for the HR-SM modernization initiative. The training is designed to bring all team members up to speed on the new architectural patterns, tools, and procedures implemented during the modernization.

## Training Schedule

### Week 1: Foundation Knowledge
- **Day 1**: Redux Toolkit Overview & Patterns
- **Day 2**: Repository Pattern Implementation
- **Day 3**: E2E Testing Framework
- **Day 4**: License Server Architecture
- **Day 5**: Hands-on Workshop & Q&A

### Week 2: Advanced Topics & Operations
- **Day 1**: Debugging & Troubleshooting
- **Day 2**: Performance Monitoring & Optimization
- **Day 3**: Deployment & Rollback Procedures
- **Day 4**: Security Considerations
- **Day 5**: Team Assessment & Certification

## Module 1: Redux Toolkit State Management

### Learning Objectives
By the end of this module, team members will be able to:
- Understand Redux Toolkit architecture and benefits
- Create and modify Redux slices
- Implement async thunks for API calls
- Debug Redux state using DevTools
- Handle state persistence and hydration

### Key Concepts

#### Redux Store Structure
```javascript
// Store configuration example
import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'tenant'] // Only persist these slices
}

export const store = configureStore({
  reducer: {
    auth: persistReducer(persistConfig, authSlice.reducer),
    tenant: tenantSlice.reducer,
    modules: moduleSlice.reducer,
    notifications: notificationSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})
```

#### Creating Redux Slices
```javascript
// Example slice structure
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Async thunk for API calls
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload.message
      })
  }
})
```

#### Using Redux in Components
```javascript
// Component integration example
import { useSelector, useDispatch } from 'react-redux'
import { loginUser, logout } from '../store/slices/authSlice'

const LoginComponent = () => {
  const dispatch = useDispatch()
  const { user, loading, error } = useSelector(state => state.auth)

  const handleLogin = async (credentials) => {
    const result = await dispatch(loginUser(credentials))
    if (loginUser.fulfilled.match(result)) {
      // Handle success
    }
  }

  return (
    // Component JSX
  )
}
```

### Practical Exercises

#### Exercise 1: Create a New Redux Slice
Create a `settingsSlice` for user preferences:
- Theme selection (light/dark)
- Language preference
- Notification settings
- Async thunk for saving settings to server

#### Exercise 2: Migrate Context to Redux
Take an existing Context provider and convert it to Redux:
- Identify state structure
- Create appropriate slice
- Update components to use Redux
- Test state persistence

#### Exercise 3: Debug Redux State
Using Redux DevTools:
- Inspect state changes
- Time-travel debugging
- Identify performance issues
- Export/import state for testing

### Common Patterns & Best Practices

#### State Normalization
```javascript
// Normalized state structure
const initialState = {
  users: {
    byId: {},
    allIds: []
  },
  loading: false,
  error: null
}

// Reducer for normalized data
.addCase(fetchUsers.fulfilled, (state, action) => {
  const users = action.payload
  state.users.byId = users.reduce((acc, user) => {
    acc[user.id] = user
    return acc
  }, {})
  state.users.allIds = users.map(user => user.id)
})
```

#### Error Handling Patterns
```javascript
// Consistent error handling
const handleAsyncError = (state, action) => {
  state.loading = false
  state.error = {
    message: action.payload?.message || 'An error occurred',
    code: action.payload?.code,
    timestamp: new Date().toISOString()
  }
}
```

## Module 2: Repository Pattern Implementation

### Learning Objectives
- Understand Repository Pattern benefits and structure
- Implement repositories for different model types
- Use repositories in services effectively
- Write tests for repository operations
- Handle transactions and complex queries

### Key Concepts

#### Base Repository Structure
```javascript
class BaseRepository {
  constructor(model) {
    this.model = model
  }

  async create(data) {
    try {
      const document = new this.model(data)
      return await document.save()
    } catch (error) {
      throw new RepositoryError('Create operation failed', error)
    }
  }

  async findById(id) {
    try {
      return await this.model.findById(id)
    } catch (error) {
      throw new RepositoryError('Find operation failed', error)
    }
  }

  async find(filter = {}, options = {}) {
    try {
      const query = this.model.find(filter)
      
      if (options.populate) {
        query.populate(options.populate)
      }
      
      if (options.sort) {
        query.sort(options.sort)
      }
      
      if (options.limit) {
        query.limit(options.limit)
      }
      
      if (options.skip) {
        query.skip(options.skip)
      }
      
      return await query.exec()
    } catch (error) {
      throw new RepositoryError('Find operation failed', error)
    }
  }

  async update(id, data) {
    try {
      return await this.model.findByIdAndUpdate(id, data, { 
        new: true, 
        runValidators: true 
      })
    } catch (error) {
      throw new RepositoryError('Update operation failed', error)
    }
  }

  async delete(id) {
    try {
      const result = await this.model.findByIdAndDelete(id)
      return !!result
    } catch (error) {
      throw new RepositoryError('Delete operation failed', error)
    }
  }

  async withTransaction(operations) {
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      const results = await operations(session)
      await session.commitTransaction()
      return results
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  }
}
```

#### Specialized Repository Example
```javascript
class UserRepository extends BaseRepository {
  constructor() {
    super(User)
  }

  async findByEmail(email) {
    return await this.findOne({ email })
  }

  async findByRole(role, tenantId) {
    return await this.find({ 
      role, 
      tenantId 
    }, { 
      populate: 'department position' 
    })
  }

  async findActiveUsers(tenantId) {
    return await this.find({
      tenantId,
      status: 'active',
      deletedAt: null
    })
  }

  async getUsersWithPagination(tenantId, page = 1, limit = 10) {
    const skip = (page - 1) * limit
    const users = await this.find(
      { tenantId },
      { skip, limit, sort: { createdAt: -1 } }
    )
    const total = await this.count({ tenantId })
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }
}
```

#### Service Integration
```javascript
class UserService {
  constructor(userRepository, departmentRepository) {
    this.userRepository = userRepository
    this.departmentRepository = departmentRepository
  }

  async createUser(userData) {
    // Validate department exists
    const department = await this.departmentRepository.findById(userData.departmentId)
    if (!department) {
      throw new ServiceError('Department not found', 'DEPARTMENT_NOT_FOUND')
    }

    // Create user through repository
    return await this.userRepository.create(userData)
  }

  async transferUserDepartment(userId, newDepartmentId) {
    return await this.userRepository.withTransaction(async (session) => {
      // Update user department
      const user = await this.userRepository.update(userId, {
        departmentId: newDepartmentId,
        transferredAt: new Date()
      })

      // Log the transfer
      await this.auditRepository.create({
        action: 'USER_DEPARTMENT_TRANSFER',
        userId,
        oldDepartmentId: user.departmentId,
        newDepartmentId,
        timestamp: new Date()
      })

      return user
    })
  }
}
```

### Practical Exercises

#### Exercise 1: Create Custom Repository
Create a `ReportRepository` with methods for:
- Generating attendance reports
- Calculating payroll summaries
- Finding overdue tasks
- Aggregating department statistics

#### Exercise 2: Transaction Handling
Implement a complex operation using transactions:
- Employee termination process
- Bulk user import with validation
- Department restructuring

#### Exercise 3: Query Optimization
Optimize repository queries:
- Add proper MongoDB indexes
- Implement query caching
- Use aggregation pipelines
- Measure performance improvements

## Module 3: E2E Testing Framework

### Learning Objectives
- Set up and configure Cypress/Playwright
- Write effective E2E tests
- Create reusable test utilities
- Handle test data and fixtures
- Debug failing tests

### Key Concepts

#### Test Structure
```javascript
// Cypress test example
describe('User Authentication Flow', () => {
  beforeEach(() => {
    // Set up test data
    cy.task('db:seed', 'users')
    cy.visit('/login')
  })

  it('should login with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('user@example.com')
    cy.get('[data-testid="password-input"]').type('password123')
    cy.get('[data-testid="login-button"]').click()
    
    cy.url().should('include', '/dashboard')
    cy.get('[data-testid="user-menu"]').should('contain', 'John Doe')
  })

  it('should show error with invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('invalid@example.com')
    cy.get('[data-testid="password-input"]').type('wrongpassword')
    cy.get('[data-testid="login-button"]').click()
    
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials')
  })
})
```

#### Custom Commands
```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (email, password) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token)
  })
})

Cypress.Commands.add('createTestUser', (userData) => {
  return cy.task('db:create', { collection: 'users', data: userData })
})

Cypress.Commands.add('switchTenant', (tenantId) => {
  cy.get('[data-testid="tenant-selector"]').click()
  cy.get(`[data-testid="tenant-option-${tenantId}"]`).click()
  cy.wait('@switchTenant')
})
```

#### Page Object Pattern
```javascript
// cypress/support/page-objects/LoginPage.js
class LoginPage {
  visit() {
    cy.visit('/login')
    return this
  }

  fillEmail(email) {
    cy.get('[data-testid="email-input"]').type(email)
    return this
  }

  fillPassword(password) {
    cy.get('[data-testid="password-input"]').type(password)
    return this
  }

  submit() {
    cy.get('[data-testid="login-button"]').click()
    return this
  }

  shouldShowError(message) {
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', message)
    return this
  }

  shouldRedirectToDashboard() {
    cy.url().should('include', '/dashboard')
    return this
  }
}

export default new LoginPage()
```

### Practical Exercises

#### Exercise 1: Write Multi-Tenant Tests
Create tests that verify:
- Data isolation between tenants
- Proper tenant switching
- Access control enforcement

#### Exercise 2: Test Complex Workflows
Implement E2E tests for:
- Leave request approval process
- Employee onboarding workflow
- Payroll calculation and approval

#### Exercise 3: Error Handling Tests
Create tests for:
- Network failure scenarios
- Server error responses
- Form validation errors

## Module 4: License Server Architecture

### Learning Objectives
- Understand microservice architecture
- Implement JWT-based license validation
- Handle service communication and failures
- Monitor and maintain the license server

### Key Concepts

#### License Server Structure
```javascript
// License generation service
class LicenseGenerator {
  constructor(privateKey) {
    this.privateKey = privateKey
  }

  async generateLicense(licenseData) {
    const payload = {
      licenseNumber: licenseData.licenseNumber,
      tenantId: licenseData.tenantId,
      features: licenseData.features,
      limits: licenseData.limits,
      issuedAt: new Date(),
      expiresAt: licenseData.expiresAt
    }

    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: licenseData.duration
    })

    // Store license in database
    await License.create({
      ...payload,
      token,
      status: 'active'
    })

    return token
  }
}
```

#### License Validation
```javascript
// License validation service
class LicenseValidator {
  constructor(publicKey) {
    this.publicKey = publicKey
  }

  async validateLicense(token) {
    try {
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: ['RS256']
      })

      // Check license status in database
      const license = await License.findOne({
        licenseNumber: decoded.licenseNumber
      })

      if (!license || license.status !== 'active') {
        throw new Error('License is not active')
      }

      // Check expiry
      if (new Date() > new Date(decoded.expiresAt)) {
        throw new Error('License has expired')
      }

      return {
        valid: true,
        license: decoded,
        features: decoded.features,
        limits: decoded.limits
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}
```

#### Integration with Main Backend
```javascript
// License validation middleware
const licenseValidationMiddleware = async (req, res, next) => {
  try {
    // Skip validation for platform admin routes
    if (req.path.startsWith('/platform/')) {
      return next()
    }

    const tenantId = req.headers['x-tenant-id']
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' })
    }

    // Check cached validation first
    const cachedValidation = await redis.get(`license:${tenantId}`)
    if (cachedValidation) {
      const validation = JSON.parse(cachedValidation)
      if (validation.valid && new Date() < new Date(validation.expiresAt)) {
        req.license = validation.license
        return next()
      }
    }

    // Validate with license server
    const validation = await licenseServerClient.validateTenantLicense(tenantId)
    
    if (!validation.valid) {
      return res.status(403).json({ 
        error: 'Invalid or expired license',
        code: 'LICENSE_INVALID'
      })
    }

    // Cache validation result
    await redis.setex(`license:${tenantId}`, 3600, JSON.stringify(validation))
    
    req.license = validation.license
    next()
  } catch (error) {
    // Graceful degradation - allow access if license server is down
    if (error.code === 'ECONNREFUSED') {
      console.warn('License server unavailable, allowing access')
      return next()
    }
    
    res.status(500).json({ error: 'License validation failed' })
  }
}
```

### Practical Exercises

#### Exercise 1: Implement License Features
Add feature-based validation:
- Check if tenant has access to specific modules
- Implement usage limits (users, storage, API calls)
- Handle feature upgrades and downgrades

#### Exercise 2: Handle Service Failures
Implement resilience patterns:
- Circuit breaker for license server calls
- Retry logic with exponential backoff
- Graceful degradation strategies

#### Exercise 3: Monitor License Usage
Create monitoring and alerting:
- Track license usage metrics
- Alert on approaching limits
- Generate usage reports

## Module 5: Debugging & Troubleshooting

### Common Issues & Solutions

#### Redux Issues

**Issue: State not persisting**
```javascript
// Check persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'tenant'], // Make sure slice is whitelisted
  blacklist: ['notifications'] // Exclude temporary state
}
```

**Issue: Actions not updating state**
```javascript
// Ensure reducers are pure functions
// BAD
const badReducer = (state, action) => {
  state.users.push(action.payload) // Mutating state directly
  return state
}

// GOOD
const goodReducer = (state, action) => {
  return {
    ...state,
    users: [...state.users, action.payload]
  }
}
```

#### Repository Issues

**Issue: Queries are slow**
```javascript
// Add proper indexes
await User.createIndex({ tenantId: 1, email: 1 })
await Attendance.createIndex({ tenantId: 1, date: -1 })

// Use explain() to analyze queries
const explain = await User.find({ tenantId }).explain('executionStats')
console.log(explain.executionStats)
```

**Issue: Transaction failures**
```javascript
// Ensure proper error handling in transactions
async withTransaction(operations) {
  const session = await mongoose.startSession()
  
  try {
    session.startTransaction()
    const result = await operations(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    await session.abortTransaction()
    throw new RepositoryError('Transaction failed', error)
  } finally {
    session.endSession()
  }
}
```

#### License Server Issues

**Issue: JWT verification failing**
```javascript
// Check key format and algorithm
const publicKey = fs.readFileSync('public.pem', 'utf8')
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'] // Ensure algorithm matches
})
```

**Issue: License server connection timeouts**
```javascript
// Implement proper timeout and retry
const licenseServerClient = axios.create({
  baseURL: process.env.LICENSE_SERVER_URL,
  timeout: 5000,
  retry: 3,
  retryDelay: 1000
})
```

### Debugging Tools & Techniques

#### Redux DevTools
- Time-travel debugging
- Action replay
- State inspection
- Performance monitoring

#### Database Debugging
```javascript
// Enable Mongoose debugging
mongoose.set('debug', true)

// Custom query logging
const originalExec = mongoose.Query.prototype.exec
mongoose.Query.prototype.exec = function() {
  console.log('Query:', this.getQuery())
  console.log('Collection:', this.mongooseCollection.name)
  return originalExec.apply(this, arguments)
}
```

#### License Server Debugging
```javascript
// Add comprehensive logging
const winston = require('winston')

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'license-server.log' })
  ]
})

// Log all license operations
app.use((req, res, next) => {
  logger.info('License server request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  })
  next()
})
```

## Assessment & Certification

### Knowledge Check Questions

#### Redux Toolkit
1. What are the benefits of using Redux Toolkit over plain Redux?
2. How do you handle async operations in Redux Toolkit?
3. What is the purpose of Redux persist middleware?
4. How do you debug Redux state issues?

#### Repository Pattern
1. What problems does the Repository Pattern solve?
2. How do you implement transactions in repositories?
3. What are the best practices for repository error handling?
4. How do you optimize repository queries?

#### E2E Testing
1. What is the difference between E2E and unit tests?
2. How do you handle test data in E2E tests?
3. What are the best practices for writing stable E2E tests?
4. How do you debug failing E2E tests?

#### License Server
1. Why extract license management to a microservice?
2. How do you handle license server failures gracefully?
3. What are the security considerations for JWT licenses?
4. How do you monitor license usage and performance?

### Practical Assessment

#### Task 1: Redux Implementation
Create a new Redux slice for managing notifications with:
- Add notification action
- Remove notification action
- Clear all notifications action
- Auto-dismiss after timeout

#### Task 2: Repository Creation
Implement a `ReportRepository` with methods for:
- Generating monthly attendance reports
- Calculating department productivity metrics
- Finding overdue tasks by department
- Aggregating payroll data

#### Task 3: E2E Test Writing
Write E2E tests for the employee onboarding workflow:
- HR creates new employee
- Employee receives welcome email
- Employee completes profile setup
- Manager assigns initial tasks
- Employee appears in department roster

#### Task 4: License Server Integration
Implement a new license feature:
- Add "advanced_reporting" feature to license
- Update license validation to check this feature
- Modify UI to show/hide advanced reports based on license
- Test feature upgrade/downgrade scenarios

### Certification Criteria

To be certified on the HR-SM modernization:
- [ ] Pass knowledge check with 80% or higher
- [ ] Complete all practical assessment tasks
- [ ] Demonstrate debugging skills in live session
- [ ] Show understanding of deployment procedures
- [ ] Explain rollback procedures for each component

### Ongoing Learning Resources

#### Documentation
- [Redux Toolkit Official Docs](https://redux-toolkit.js.org/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [Cypress Documentation](https://docs.cypress.io/)
- [JWT.io](https://jwt.io/)

#### Internal Resources
- Code review guidelines
- Architecture decision records
- Troubleshooting runbooks
- Performance monitoring dashboards

#### Community Resources
- Internal Slack channels
- Weekly tech talks
- Code review sessions
- Architecture discussions

## Training Feedback & Improvement

### Feedback Collection
- Post-training surveys
- One-on-one feedback sessions
- Team retrospectives
- Continuous improvement suggestions

### Training Updates
- Regular content updates based on feedback
- New examples and exercises
- Updated troubleshooting guides
- Additional resources and references