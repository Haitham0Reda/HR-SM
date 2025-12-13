import mongoose from 'mongoose';
import IDCard from '../../modules/documents/models/idCard.model.js';
import User from '../../modules/hr-core/users/models/user.model.js';
import Department from '../../modules/hr-core/users/models/department.model.js';
// organization model removed - not needed for general HR system
import Position from '../../modules/hr-core/users/models/position.model.js';

let user;
let department;
// organization variable removed
let position;

beforeAll(async () => {
  organization = await organization.create({
    organizationCode: 'ENG',
    name: 'organization of Engineering',
    arabicName: 'المعهد الكندى العالى للهندسة بالسادس من اكتوبر'
  });

  department = await Department.create({
      tenantId: 'test_tenant_123',
    name: 'Test Department',
    code: 'TEST': organization._id
  });

  position = await Position.create({
    title: 'Test Position',
    code: 'TP001',
    department: department._id
  });
});

beforeEach(async () => {
  // Create user for testing (in beforeEach because the global afterEach clears all data)
  user = await User.create({
      tenantId: 'test_tenant_123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    employeeId: 'EMP001': organization._id,
    department: department._id,
    position: position._id
  });
});

afterAll(async () => {
  // Clean up test data
});

describe('IDCard Model', () => {
  it('should create a new ID card with required fields', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const idCard = await IDCard.create({
      employee: user._id,
      department: department._id: organization._id,
      position: position._id,
      cardNumber: 'ID001',
      'expiry.expiryDate': futureDate,
      'issue.issuedBy': user._id
    });

    expect(idCard.employee.toString()).toBe(user._id.toString());
    expect(idCard.cardNumber).toBe('ID001');
    expect(idCard.cardType).toBe('employee');
    expect(idCard.status).toBe('active');
    expect(idCard.isActive).toBe(true);
  });

  it('should validate cardType enum values', async () => {
    const validTypes = ['employee', 'contractor', 'visitor', 'temporary'];

    for (const type of validTypes) {
      const idCard = new IDCard({
        employee: user._id,
        cardNumber: `ID${Math.random()}`,
        cardType: type,
        'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        'issue.issuedBy': user._id
      });

      await expect(idCard.validate()).resolves.toBeUndefined();
    }

    // Test invalid type
    const invalidCard = new IDCard({
      employee: user._id,
      cardNumber: 'ID002',
      cardType: 'invalid',
      'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      'issue.issuedBy': user._id
    });

    await expect(invalidCard.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should validate status enum values', async () => {
    const validStatuses = ['active', 'expired', 'suspended', 'lost', 'stolen', 'replaced', 'cancelled'];

    for (const status of validStatuses) {
      const idCard = new IDCard({
        employee: user._id,
        cardNumber: `ID${Math.random()}`,
        status: status,
        'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        'issue.issuedBy': user._id
      });

      await expect(idCard.validate()).resolves.toBeUndefined();
    }

    // Test invalid status
    const invalidCard = new IDCard({
      employee: user._id,
      cardNumber: 'ID003',
      status: 'invalid',
      'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      'issue.issuedBy': user._id
    });

    await expect(invalidCard.validate()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  it('should calculate virtual properties correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15); // 15 days from now

    const idCard = await IDCard.create({
      employee: user._id,
      cardNumber: 'ID004',
      'expiry.expiryDate': futureDate,
      'issue.issuedBy': user._id
    });

    expect(idCard.isExpired).toBe(false);
    expect(idCard.needsRenewal).toBe(true); // Within 30 days
    expect(idCard.daysUntilExpiry).toBeGreaterThan(0);
    expect(idCard.daysUntilExpiry).toBeLessThanOrEqual(15);
    expect(idCard.printCount).toBe(0);
  });

  it('should log print activity', async () => {
    const idCard = await IDCard.create({
      employee: user._id,
      cardNumber: 'ID005',
      'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      'issue.issuedBy': user._id
    });

    const updatedCard = await idCard.logPrint(user._id, 'individual', 'Initial print');

    expect(updatedCard.printHistory).toHaveLength(1);
    expect(updatedCard.printHistory[0].printedBy.toString()).toBe(user._id.toString());
    expect(updatedCard.printHistory[0].printType).toBe('individual');
    expect(updatedCard.printHistory[0].printReason).toBe('Initial print');
    expect(updatedCard.printHistory[0].printStatus).toBe('success');
    expect(updatedCard.printCount).toBe(1);
  });

  it('should mark card as expired', async () => {
    const idCard = await IDCard.create({
      employee: user._id,
      cardNumber: 'ID006',
      'expiry.expiryDate': new Date(Date.now() - 1), // Already expired
      'issue.issuedBy': user._id
    });

    const updatedCard = await idCard.markExpired();

    expect(updatedCard.status).toBe('expired');
    expect(updatedCard.isActive).toBe(false);
  });

  it('should replace a card', async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const originalCard = await IDCard.create({
      employee: user._id,
      department: department._id: organization._id,
      position: position._id,
      cardNumber: 'ID007',
      'expiry.expiryDate': futureDate,
      'issue.issuedBy': user._id
    });

    const replacementCard = await originalCard.replaceCard(user._id, 'damaged');

    // Check original card was updated
    const updatedOriginal = await IDCard.findById(originalCard._id);
    expect(updatedOriginal.status).toBe('replaced');
    expect(updatedOriginal.isActive).toBe(false);
    expect(updatedOriginal.replacement.replacedBy.toString()).toBe(replacementCard._id.toString());
    expect(updatedOriginal.replacement.replacementReason).toBe('damaged');

    // Check replacement card was created correctly
    expect(replacementCard.employee.toString()).toBe(user._id.toString());
    expect(replacementCard.cardNumber).not.toBe('ID007'); // Should have new card number
    expect(replacementCard.status).toBe('active');
    expect(replacementCard.isActive).toBe(true);
    expect(replacementCard.replacement.originalCard.toString()).toBe(originalCard._id.toString());
    expect(replacementCard.replacement.replacementReason).toBe('damaged');

    // Check that the replacement card has required fields
    expect(replacementCard.cardNumber).toBeDefined();
    expect(replacementCard.expiry.expiryDate).toBeDefined();
  });

  it('should renew a card', async () => {
    const idCard = await IDCard.create({
      employee: user._id,
      cardNumber: 'ID008',
      'expiry.expiryDate': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      'issue.issuedBy': user._id
    });

    const updatedCard = await idCard.renewCard(user._id);

    expect(updatedCard.status).toBe('active');
    expect(updatedCard.isActive).toBe(true);
    // Check that a print history entry was added for renewal
    expect(updatedCard.printHistory).toHaveLength(1);
    expect(updatedCard.printHistory[0].printReason).toBe('renewal');
  });
});
