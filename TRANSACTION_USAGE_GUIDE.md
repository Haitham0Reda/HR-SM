# Transaction Usage Guide

## Overview

This guide demonstrates how to use the transaction wrapper utility in services to ensure data consistency and atomicity for multi-step database operations.

## Transaction Wrapper Utility

Location: `server/utils/transactionWrapper.js`

### Available Functions

1. **withTransaction** - Execute a single operation within a transaction
2. **withTransactionBatch** - Execute multiple operations in a single transaction
3. **withTransactionRetry** - Execute with automatic retry logic for transient failures

### Isolation Levels

- `READ_UNCOMMITTED` - Lowest isolation, highest performance
- `READ_COMMITTED` - Default, prevents dirty reads
- `REPEATABLE_READ` - Prevents non-repeatable reads
- `SERIALIZABLE` - Highest isolation, prevents phantom reads

## Usage Examples

### Example 1: Simple Transaction

```javascript
const { withTransaction } = require('../utils/transactionWrapper');
const { getMainAppDb } = require('../config/database');

async function transferFunds(fromAccountId, toAccountId, amount, tenantId) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    // Deduct from source account
    const fromAccount = await Account.findOne({
      where: { id: fromAccountId, tenantId },
      transaction
    });
    
    if (fromAccount.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    fromAccount.balance -= amount;
    await fromAccount.save({ transaction });
    
    // Add to destination account
    const toAccount = await Account.findOne({
      where: { id: toAccountId, tenantId },
      transaction
    });
    
    toAccount.balance += amount;
    await toAccount.save({ transaction });
    
    // Create transaction record
    await Transaction.create({
      tenantId,
      fromAccountId,
      toAccountId,
      amount,
      type: 'transfer',
      timestamp: new Date()
    }, { transaction });
    
    return { success: true, fromAccount, toAccount };
  }, {
    operationName: 'transferFunds',
    isolationLevel: ISOLATION_LEVELS.SERIALIZABLE
  });
}
```

### Example 2: Batch Operations

```javascript
const { withTransactionBatch } = require('../utils/transactionWrapper');

async function bulkCreateUsers(tenantId, usersData) {
  const db = getMainAppDb();
  
  const operations = usersData.map(userData => {
    return async (transaction) => {
      // Create user
      const user = await User.create({
        tenantId,
        ...userData
      }, { transaction });
      
      // Create default settings
      await UserSettings.create({
        tenantId,
        userId: user.id,
        theme: 'light',
        language: 'en'
      }, { transaction });
      
      return user;
    };
  });
  
  return await withTransactionBatch(db, operations, {
    operationName: 'bulkCreateUsers'
  });
}
```

### Example 3: Transaction with Retry Logic

```javascript
const { withTransactionRetry, ISOLATION_LEVELS } = require('../utils/transactionWrapper');

async function updateInventory(productId, quantity, tenantId) {
  const db = getMainAppDb();
  
  return await withTransactionRetry(db, async (transaction) => {
    const product = await Product.findOne({
      where: { id: productId, tenantId },
      transaction,
      lock: transaction.LOCK.UPDATE // Pessimistic locking
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    
    product.stock -= quantity;
    await product.save({ transaction });
    
    // Log inventory change
    await InventoryLog.create({
      tenantId,
      productId,
      change: -quantity,
      newStock: product.stock,
      timestamp: new Date()
    }, { transaction });
    
    return product;
  }, {
    operationName: 'updateInventory',
    maxRetries: 5,
    retryDelay: 500,
    isolationLevel: ISOLATION_LEVELS.SERIALIZABLE
  });
}
```

### Example 4: Tenant Provisioning (Real Implementation)

```javascript
// From: server/platform/tenants/services/tenantProvisioningService.sequelize.js

async createTenant(tenantData) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    // 1. Generate unique tenant ID
    let tenantId = this.generateTenantId(tenantData.name);
    
    // 2. Check uniqueness
    const existing = await Tenant.findOne({ 
      where: { tenantId },
      transaction 
    });
    
    if (existing) {
      throw new Error('Tenant ID already exists');
    }
    
    // 3. Create tenant
    const tenant = await Tenant.create({
      tenantId,
      name: tenantData.name,
      status: 'trial',
      // ... other fields
    }, { transaction });
    
    // 4. Create admin user (within same transaction)
    const adminUser = await this.createAdminUser(
      tenantId, 
      tenantData.adminUser,
      transaction
    );
    
    // 5. Update tenant usage
    tenant.usage = {
      ...tenant.usage,
      userCount: 1
    };
    await tenant.save({ transaction });
    
    // 6. Seed default data
    await this.seedDefaultData(tenantId, transaction);
    
    return { tenant, adminUser };
  }, {
    operationName: 'createTenant'
  });
}
```

### Example 5: Payroll Processing

```javascript
async function processPayroll(tenantId, payrollPeriod) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    // Get all active employees
    const employees = await User.findAll({
      where: { 
        tenantId,
        status: 'active',
        employmentStatus: 'employed'
      },
      transaction
    });
    
    const payrollRecords = [];
    
    for (const employee of employees) {
      // Calculate salary
      const salary = await calculateSalary(employee, payrollPeriod, transaction);
      
      // Create payroll record
      const payroll = await Payroll.create({
        tenantId,
        userId: employee.id,
        period: payrollPeriod,
        grossSalary: salary.gross,
        deductions: salary.deductions,
        netSalary: salary.net,
        status: 'pending'
      }, { transaction });
      
      payrollRecords.push(payroll);
      
      // Create accounting entry
      await AccountingEntry.create({
        tenantId,
        type: 'payroll',
        amount: salary.net,
        employeeId: employee.id,
        payrollId: payroll.id,
        date: new Date()
      }, { transaction });
    }
    
    return payrollRecords;
  }, {
    operationName: 'processPayroll',
    isolationLevel: ISOLATION_LEVELS.SERIALIZABLE
  });
}
```

## Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```javascript
// ❌ BAD: No transaction
async function createOrderWithItems(orderData, items) {
  const order = await Order.create(orderData);
  
  for (const item of items) {
    await OrderItem.create({ orderId: order.id, ...item });
  }
  // If OrderItem creation fails, Order is already created!
}

// ✅ GOOD: With transaction
async function createOrderWithItems(orderData, items) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    const order = await Order.create(orderData, { transaction });
    
    for (const item of items) {
      await OrderItem.create({ 
        orderId: order.id, 
        ...item 
      }, { transaction });
    }
    
    return order;
  });
}
```

### 2. Pass Transaction to All Database Operations

```javascript
// ❌ BAD: Missing transaction parameter
async function updateUserProfile(userId, profileData, transaction) {
  const user = await User.findByPk(userId); // Missing transaction!
  user.profile = profileData;
  await user.save({ transaction });
}

// ✅ GOOD: Transaction passed to all operations
async function updateUserProfile(userId, profileData, transaction) {
  const user = await User.findByPk(userId, { transaction });
  user.profile = profileData;
  await user.save({ transaction });
}
```

### 3. Use Appropriate Isolation Levels

```javascript
// For read-heavy operations with low conflict risk
withTransaction(db, callback, {
  isolationLevel: ISOLATION_LEVELS.READ_COMMITTED
});

// For operations requiring strict consistency (financial transactions)
withTransaction(db, callback, {
  isolationLevel: ISOLATION_LEVELS.SERIALIZABLE
});
```

### 4. Handle Errors Properly

```javascript
async function processOrder(orderId) {
  const db = getMainAppDb();
  
  try {
    return await withTransaction(db, async (transaction) => {
      // ... operations
    }, {
      operationName: 'processOrder'
    });
  } catch (error) {
    // Transaction is automatically rolled back
    logger.error('Order processing failed', { orderId, error });
    
    // Send notification, update status, etc.
    await notifyOrderFailure(orderId, error.message);
    
    throw error; // Re-throw or return error response
  }
}
```

### 5. Use Retry Logic for Transient Failures

```javascript
// For operations that might face deadlocks or connection issues
return await withTransactionRetry(db, async (transaction) => {
  // ... operations
}, {
  maxRetries: 3,
  retryDelay: 1000,
  operationName: 'criticalOperation'
});
```

## Common Patterns

### Pattern 1: Create Parent with Children

```javascript
async function createProjectWithTasks(projectData, tasks, tenantId) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    const project = await Project.create({
      tenantId,
      ...projectData
    }, { transaction });
    
    const createdTasks = await Promise.all(
      tasks.map(task => 
        Task.create({
          tenantId,
          projectId: project.id,
          ...task
        }, { transaction })
      )
    );
    
    return { project, tasks: createdTasks };
  });
}
```

### Pattern 2: Update with Audit Trail

```javascript
async function updateWithAudit(modelName, recordId, updates, userId, tenantId) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    const Model = require(`../models/${modelName}`);
    
    const record = await Model.findOne({
      where: { id: recordId, tenantId },
      transaction
    });
    
    const oldValues = { ...record.toJSON() };
    
    await record.update(updates, { transaction });
    
    await AuditLog.create({
      tenantId,
      modelName,
      recordId,
      action: 'update',
      oldValues,
      newValues: updates,
      userId,
      timestamp: new Date()
    }, { transaction });
    
    return record;
  });
}
```

### Pattern 3: Conditional Operations

```javascript
async function approveExpense(expenseId, approverId, tenantId) {
  const db = getMainAppDb();
  
  return await withTransaction(db, async (transaction) => {
    const expense = await Expense.findOne({
      where: { id: expenseId, tenantId },
      transaction
    });
    
    if (expense.status !== 'pending') {
      throw new Error('Expense is not pending approval');
    }
    
    if (expense.amount > 10000) {
      // Requires senior approval
      expense.status = 'pending_senior_approval';
      await expense.save({ transaction });
      
      await Notification.create({
        tenantId,
        type: 'senior_approval_required',
        expenseId,
        amount: expense.amount
      }, { transaction });
    } else {
      // Approve directly
      expense.status = 'approved';
      expense.approvedBy = approverId;
      expense.approvedAt = new Date();
      await expense.save({ transaction });
      
      // Process payment
      await Payment.create({
        tenantId,
        expenseId,
        amount: expense.amount,
        status: 'scheduled'
      }, { transaction });
    }
    
    return expense;
  });
}
```

## Testing Transactions

### Test Rollback Behavior

```javascript
describe('Transaction Rollback', () => {
  it('should rollback all changes on error', async () => {
    const db = getMainAppDb();
    
    try {
      await withTransaction(db, async (transaction) => {
        await User.create({ name: 'Test' }, { transaction });
        throw new Error('Simulated error');
      });
    } catch (error) {
      // Expected error
    }
    
    // Verify user was not created
    const user = await User.findOne({ where: { name: 'Test' } });
    expect(user).toBeNull();
  });
});
```

### Test Isolation

```javascript
describe('Transaction Isolation', () => {
  it('should not see uncommitted changes from other transactions', async () => {
    const db = getMainAppDb();
    
    // Start transaction 1
    const tx1Promise = withTransaction(db, async (transaction) => {
      await User.create({ name: 'User1' }, { transaction });
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'tx1';
    });
    
    // Start transaction 2 (should not see User1)
    await new Promise(resolve => setTimeout(resolve, 100));
    const user = await User.findOne({ where: { name: 'User1' } });
    expect(user).toBeNull();
    
    await tx1Promise;
  });
});
```

## Performance Considerations

1. **Keep Transactions Short** - Long transactions hold locks and can cause contention
2. **Avoid External API Calls** - Don't make HTTP requests inside transactions
3. **Use Appropriate Isolation Levels** - Higher isolation = more locking = lower performance
4. **Batch Operations** - Use bulk operations when possible
5. **Monitor Deadlocks** - Log and analyze deadlock patterns

## Troubleshooting

### Deadlock Detection

```javascript
try {
  await withTransactionRetry(db, callback, {
    maxRetries: 5,
    operationName: 'potentialDeadlock'
  });
} catch (error) {
  if (error.parent && error.parent.code === '40P01') {
    logger.error('Deadlock detected after retries', { error });
    // Handle deadlock scenario
  }
}
```

### Transaction Timeout

```javascript
// Set statement timeout for long-running transactions
await withTransaction(db, async (transaction) => {
  await db.query('SET statement_timeout = 30000', { transaction }); // 30 seconds
  // ... operations
});
```

## Summary

- Use `withTransaction` for all multi-step database operations
- Pass the transaction object to all database operations within the callback
- Choose appropriate isolation levels based on consistency requirements
- Use `withTransactionRetry` for operations prone to transient failures
- Keep transactions short and focused
- Test rollback behavior thoroughly
- Monitor transaction performance and deadlocks

## Next Steps

1. Review existing services for multi-step operations
2. Add transaction support to critical operations
3. Test rollback scenarios
4. Monitor transaction performance in production
5. Document transaction usage in service-specific documentation
