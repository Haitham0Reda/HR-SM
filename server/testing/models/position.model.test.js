import mongoose from 'mongoose';
import Position from '../../models/position.model.js';

describe('Position Model', () => {
  it('should create and save a position successfully', async () => {
    const positionData = {
      title: 'Software Engineer',
      code: 'SE',
      department: new mongoose.Types.ObjectId(),
      jobDescription: 'Develop software applications',
      isActive: true
    };

    const position = new Position(positionData);
    const savedPosition = await position.save();

    expect(savedPosition._id).toBeDefined();
    expect(savedPosition.title).toBe(positionData.title);
    expect(savedPosition.code).toBe(positionData.code);
    expect(savedPosition.jobDescription).toBe(positionData.jobDescription);
    expect(savedPosition.isActive).toBe(positionData.isActive);
  });

  it('should fail to create a position without required fields', async () => {
    const positionData = {
      jobDescription: 'Position without title and code'
    };

    const position = new Position(positionData);

    let err;
    try {
      await position.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
    // Code is not required, it's auto-generated if not provided
  });

  it('should enforce unique code constraint', async () => {
    // Ensure indexes are created
    await Position.init();

    const code = 'UNIQUEPOS';
    const positionData1 = {
      title: 'Position 1',
      code: code,
      department: new mongoose.Types.ObjectId()
    };

    const positionData2 = {
      title: 'Position 2',
      code: code,
      department: new mongoose.Types.ObjectId()
    };

    const position1 = new Position(positionData1);
    await position1.save();

    const position2 = new Position(positionData2);

    let err;
    try {
      await position2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });
});