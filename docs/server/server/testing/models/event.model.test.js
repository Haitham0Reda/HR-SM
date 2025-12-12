import mongoose from 'mongoose';
import Event from '../../modules/events/models/event.model.js';

describe('Event Model', () => {
  it('should create and save an event successfully', async () => {
    const eventData = {
      title: 'Company Annual Meeting',
      description: 'Annual company meeting with all employees',
      location: 'Main Conference Hall',
      startDate: new Date('2023-12-15T09:00:00Z'),
      endDate: new Date('2023-12-15T17:00:00Z'),
      createdBy: new mongoose.Types.ObjectId(),
      isPublic: true
    };

    const event = new Event(eventData);
    const savedEvent = await event.save();

    expect(savedEvent._id).toBeDefined();
    expect(savedEvent.title).toBe(eventData.title);
    expect(savedEvent.description).toBe(eventData.description);
    expect(savedEvent.location).toBe(eventData.location);
    expect(savedEvent.startDate.toISOString()).toBe(eventData.startDate.toISOString());
    expect(savedEvent.endDate.toISOString()).toBe(eventData.endDate.toISOString());
    expect(savedEvent.createdBy.toString()).toBe(eventData.createdBy.toString());
    expect(savedEvent.isPublic).toBe(eventData.isPublic);
  });

  it('should fail to create an event without required fields', async () => {
    const eventData = {
      description: 'Event without required fields'
    };

    const event = new Event(eventData);

    let err;
    try {
      await event.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.startDate).toBeDefined();
    expect(err.errors.endDate).toBeDefined();
    expect(err.errors.createdBy).toBeDefined();
  });

  it('should handle attendees', async () => {
    const attendee1 = new mongoose.Types.ObjectId();
    const attendee2 = new mongoose.Types.ObjectId();

    const eventData = {
      title: 'Team Building Workshop',
      description: 'Team building activities and workshops',
      location: 'Training Room A',
      startDate: new Date('2023-11-20T10:00:00Z'),
      endDate: new Date('2023-11-20T16:00:00Z'),
      createdBy: new mongoose.Types.ObjectId(),
      attendees: [attendee1, attendee2],
      isPublic: false
    };

    const event = new Event(eventData);
    const savedEvent = await event.save();

    expect(savedEvent.attendees).toHaveLength(2);
    expect(savedEvent.attendees[0].toString()).toBe(attendee1.toString());
    expect(savedEvent.attendees[1].toString()).toBe(attendee2.toString());
  });
});