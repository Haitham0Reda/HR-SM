import mongoose from 'mongoose';
import Department from '../../modules/hr-core/users/models/department.model.js';

describe('Department Model', () => {
  it('should create and save a department successfully', async () => {
    const departmentData = {
      tenantId: 'test_tenant_123',
      name: 'Engineering',
      code: 'ENG',
      organization: new mongoose.Types.ObjectId(),
      description: 'technical department',
      isActive: true
    };

    const department = new Department(departmentData);
    const savedDepartment = await department.save();

    expect(savedDepartment._id).toBeDefined();
    expect(savedDepartment.name).toBe(departmentData.name);
    expect(savedDepartment.code).toBe(departmentData.code);
    expect(savedDepartment.description).toBe(departmentData.description);
    expect(savedDepartment.isActive).toBe(departmentData.isActive);
  });

  it('should fail to create a department without required fields', async () => {
    const departmentData = {
      description: 'Department without name and code'
    };

    const department = new Department(departmentData);

    let err;
    try {
      await department.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.tenantId).toBeDefined();
    expect(err.errors.name).toBeDefined();
    // Code is not required, only name and tenantId are required
  });

  it('should auto-generate unique codes when not provided', async () => {
    const departmentData1 = {
      tenantId: 'test_tenant_123',
      name: 'Department 1'
      // No code provided
    };

    const departmentData2 = {
      tenantId: 'test_tenant_123',
      name: 'Department 2'
      // No code provided
    };

    const department1 = new Department(departmentData1);
    const saved1 = await department1.save();
    expect(saved1.code).toBeDefined();

    const department2 = new Department(departmentData2);
    const saved2 = await department2.save();
    expect(saved2.code).toBeDefined();

    // Codes should be different
    expect(saved1.code).not.toBe(saved2.code);
  });

  it('should allow same code in different tenants', async () => {
    const code = 'SHARED';
    const departmentData1 = {
      tenantId: 'test_tenant_123',
      name: 'Department 1',
      code: code
    };

    const departmentData2 = {
      tenantId: 'test_tenant_456',
      name: 'Department 2',
      code: code
    };

    const department1 = new Department(departmentData1);
    const savedDept1 = await department1.save();

    const department2 = new Department(departmentData2);
    const savedDept2 = await department2.save();

    expect(savedDept1._id).toBeDefined();
    expect(savedDept2._id).toBeDefined();
    expect(savedDept1.code).toBe(code);
    expect(savedDept2.code).toBe(code);
  });
});