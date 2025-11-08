import mongoose from 'mongoose';
import Announcement from '../../models/announcement.model.js';

describe('Announcement Model', () => {
  it('should create and save an announcement successfully', async () => {
    const announcementData = {
      title: 'Test Announcement',
      content: 'This is a test announcement',
      type: 'general',
      priority: 'medium',
      targetAudience: 'all',
      publishDate: new Date(),
      isActive: true,
      createdBy: new mongoose.Types.ObjectId()
    };

    const announcement = new Announcement(announcementData);
    const savedAnnouncement = await announcement.save();

    expect(savedAnnouncement._id).toBeDefined();
    expect(savedAnnouncement.title).toBe(announcementData.title);
    expect(savedAnnouncement.content).toBe(announcementData.content);
    expect(savedAnnouncement.type).toBe(announcementData.type);
    expect(savedAnnouncement.priority).toBe(announcementData.priority);
    expect(savedAnnouncement.targetAudience).toBe(announcementData.targetAudience);
    expect(savedAnnouncement.isActive).toBe(announcementData.isActive);
  });

  it('should fail to create an announcement without required fields', async () => {
    const announcementData = {
      content: 'This is a test announcement without title'
    };

    const announcement = new Announcement(announcementData);
    
    let err;
    try {
      await announcement.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
  });
});