import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/user.routes.js';

// Create an express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User API', () => {
  describe('POST /api/users/login', () => {
    it('should respond with status 400 when email is missing', async () => {
      // Login endpoint is public and doesn't require authentication
      const response = await request(app)
        .post('/api/users/login')
        .send({ password: 'password123' });
      
      // We expect 400 because email is required
      expect(response.status).toBe(400);
    });
    
    it('should respond with status 400 when password is missing', async () => {
      // Login endpoint is public and doesn't require authentication
      const response = await request(app)
        .post('/api/users/login')
        .send({ email: 'test@example.com' });
      
      // We expect 400 because password is required
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should respond with status 401 when not authenticated', async () => {
      // Profile endpoint requires authentication
      const response = await request(app).get('/api/users/profile');
      expect(response.status).toBe(401);
    });
  });
});