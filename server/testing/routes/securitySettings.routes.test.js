import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import SecuritySettingsRoutes from '../../routes/securitySettings.routes.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock middleware
jest.mock('../../middleware/index.js', () => ({
  protect: (req, res, next) => next(),
  admin: (req, res, next) => next(),
  canManageSettings: (req, res, next) => next(),
  validateSecuritySettings: (req, res, next) => next(),
  validateIPAddress: (req, res, next) => next()
}));

// Mock controller
jest.mock('../../controller/securitySettings.controller.js', () => ({
  getSecuritySettings: (req, res) => res.status(200).json({ message: 'Security Settings' }),
  updateSecuritySettings: (req, res) => res.status(200).json({ message: 'Security Settings Updated' }),
  update2FASettings: (req, res) => res.status(200).json({ message: '2FA Settings Updated' }),
  updatePasswordPolicy: (req, res) => res.status(200).json({ message: 'Password Policy Updated' }),
  updateLockoutSettings: (req, res) => res.status(200).json({ message: 'Lockout Settings Updated' }),
  addIPToWhitelist: (req, res) => res.status(201).json({ message: 'IP Added To Whitelist' }),
  removeIPFromWhitelist: (req, res) => res.status(200).json({ message: 'IP Removed From Whitelist' }),
  toggleIPWhitelist: (req, res) => res.status(200).json({ message: 'IP Whitelist Toggled' }),
  updateSessionSettings: (req, res) => res.status(200).json({ message: 'Session Settings Updated' }),
  enableDevelopmentMode: (req, res) => res.status(200).json({ message: 'Development Mode Enabled' }),
  disableDevelopmentMode: (req, res) => res.status(200).json({ message: 'Development Mode Disabled' })
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  app = express();
  app.use(express.json());
  app.use('/api/security-settings', SecuritySettingsRoutes);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Security Settings Routes', () => {
  it('should get security settings', async () => {
    const response = await request(app)
      .get('/api/security-settings')
      .expect(200);
    
    expect(response.body.message).toBe('Security Settings');
  });

  it('should update security settings', async () => {
    const response = await request(app)
      .put('/api/security-settings')
      .send({ settings: 'updated' })
      .expect(200);
    
    expect(response.body.message).toBe('Security Settings Updated');
  });

  it('should update 2FA settings', async () => {
    const response = await request(app)
      .put('/api/security-settings/2fa')
      .send({ enabled: true })
      .expect(200);
    
    expect(response.body.message).toBe('2FA Settings Updated');
  });

  it('should update password policy', async () => {
    const response = await request(app)
      .put('/api/security-settings/password-policy')
      .send({ minLength: 8 })
      .expect(200);
    
    expect(response.body.message).toBe('Password Policy Updated');
  });

  it('should update account lockout settings', async () => {
    const response = await request(app)
      .put('/api/security-settings/lockout')
      .send({ maxAttempts: 5 })
      .expect(200);
    
    expect(response.body.message).toBe('Lockout Settings Updated');
  });

  it('should add IP to whitelist', async () => {
    const response = await request(app)
      .post('/api/security-settings/ip-whitelist')
      .send({ ip: '192.168.1.1' })
      .expect(201);
    
    expect(response.body.message).toBe('IP Added To Whitelist');
  });

  it('should remove IP from whitelist', async () => {
    const response = await request(app)
      .delete('/api/security-settings/ip-whitelist/123')
      .expect(200);
    
    expect(response.body.message).toBe('IP Removed From Whitelist');
  });

  it('should toggle IP whitelist', async () => {
    const response = await request(app)
      .put('/api/security-settings/ip-whitelist/toggle')
      .send({ enabled: true })
      .expect(200);
    
    expect(response.body.message).toBe('IP Whitelist Toggled');
  });

  it('should update session settings', async () => {
    const response = await request(app)
      .put('/api/security-settings/session')
      .send({ timeout: 3600 })
      .expect(200);
    
    expect(response.body.message).toBe('Session Settings Updated');
  });

  it('should enable development mode', async () => {
    const response = await request(app)
      .post('/api/security-settings/development-mode/enable')
      .expect(200);
    
    expect(response.body.message).toBe('Development Mode Enabled');
  });

  it('should disable development mode', async () => {
    const response = await request(app)
      .post('/api/security-settings/development-mode/disable')
      .expect(200);
    
    expect(response.body.message).toBe('Development Mode Disabled');
  });
});