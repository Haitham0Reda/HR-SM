import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification from '../../models/notification.model.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Notification Model', () => {
  it('should create and save a notification successfully', async () => {
    const notificationData = {
      recipient: new mongoose.Types.ObjectId(),
      type: 'request',
      title: 'New Leave Request',
      message: 'You have a new leave request to review',
      isRead: false,
      relatedModel: 'Leave',
      relatedId: new mongoose.Types.ObjectId()
    };

    const notification = new Notification(notificationData);
    const savedNotification = await notification.save();

    expect(savedNotification._id).toBeDefined();
    expect(savedNotification.recipient.toString()).toBe(notificationData.recipient.toString());
    expect(savedNotification.type).toBe(notificationData.type);
    expect(savedNotification.title).toBe(notificationData.title);
    expect(savedNotification.message).toBe(notificationData.message);
    expect(savedNotification.isRead).toBe(notificationData.isRead);
    expect(savedNotification.relatedModel).toBe(notificationData.relatedModel);
    expect(savedNotification.relatedId.toString()).toBe(notificationData.relatedId.toString());
  });

  it('should fail to create a notification without required fields', async () => {
    const notificationData = {
      message: 'Notification without required fields'
    };

    const notification = new Notification(notificationData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.recipient).toBeDefined();
    expect(err.errors.type).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.message).toBeDefined();
  });

  it('should validate notification type enum', async () => {
    const notificationData = {
      recipient: new mongoose.Types.ObjectId(),
      type: 'invalid-type',
      title: 'Invalid Notification Type',
      message: 'This notification has an invalid type'
    };

    const notification = new Notification(notificationData);
    
    let err;
    try {
      await notification.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.type).toBeDefined();
  });
});