import mongoose from 'mongoose';
import Department from '../../models/department.model.js';

describe('Department Model', () => {
  it('should create and save a department successfully', async () => {
    const departmentData = {
      name: 'Engineering',
      code: 'ENG',
      school: new mongoose.Types.ObjectId(),
      description: 'Engineering Department',
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
    expect(err.errors.name).toBeDefined();
    // Code is not required, only name is required
  });

  it('should enforce unique code constraint', async () => {
    const code = 'UNIQUE';
    const departmentData1 = {
      name: 'Department 1',
      code: code,
      school: new mongoose.Types.ObjectId()
    };

    const departmentData2 = {
      name: 'Department 2',
      code: code,
      school: new mongoose.Types.ObjectId()
    };

    const department1 = new Department(departmentData1);
    await department1.save();

    const department2 = new Department(departmentData2);
    
    let err;
    try {
      await department2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});