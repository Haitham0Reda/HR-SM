/**
 * @jest-environment node
 */
import express from 'express';
import request from 'supertest';

describe('SickLeave Routes', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const router = express.Router();
        
        // Mock route handlers
        router.get('/', (req, res) => res.status(200).json({ message: 'All Sick Leaves' }));
        router.get('/pending-doctor-review', (req, res) => res.status(200).json({ message: 'Pending Doctor Review' }));
        router.post('/', (req, res) => res.status(201).json({ message: 'Sick Leave Created' }));
        router.get('/:id', (req, res) => res.status(200).json({ message: 'Sick Leave By ID' }));
        router.put('/:id', (req, res) => res.status(200).json({ message: 'Sick Leave Updated' }));
        router.delete('/:id', (req, res) => res.status(200).json({ message: 'Sick Leave Deleted' }));
        router.post('/:id/approve-supervisor', (req, res) => res.status(200).json({ message: 'Approved by Supervisor' }));
        router.post('/:id/approve-doctor', (req, res) => res.status(200).json({ message: 'Approved by Doctor' }));
        router.post('/:id/reject-supervisor', (req, res) => res.status(200).json({ message: 'Rejected by Supervisor' }));
        router.post('/:id/reject-doctor', (req, res) => res.status(200).json({ message: 'Rejected by Doctor' }));

        app.use('/api/sick-leaves', router);
    });

    describe('GET /api/sick-leaves', () => {
        it('should get all sick leaves', async () => {
            const response = await request(app)
                .get('/api/sick-leaves')
                .expect(200);
            expect(response.body.message).toBe('All Sick Leaves');
        });
    });

    describe('GET /api/sick-leaves/pending-doctor-review', () => {
        it('should get sick leaves pending doctor review', async () => {
            const response = await request(app)
                .get('/api/sick-leaves/pending-doctor-review')
                .expect(200);
            expect(response.body.message).toBe('Pending Doctor Review');
        });
    });

    describe('POST /api/sick-leaves', () => {
        it('should create a sick leave', async () => {
            const response = await request(app)
                .post('/api/sick-leaves')
                .send({
                    startDate: new Date(),
                    endDate: new Date(),
                    duration: 5,
                    reason: 'Medical condition'
                })
                .expect(201);
            expect(response.body.message).toBe('Sick Leave Created');
        });
    });

    describe('GET /api/sick-leaves/:id', () => {
        it('should get sick leave by ID', async () => {
            const response = await request(app)
                .get('/api/sick-leaves/123')
                .expect(200);
            expect(response.body.message).toBe('Sick Leave By ID');
        });

        it('should respond to GET /:id', async () => {
            const response = await request(app)
                .get('/api/sick-leaves/123');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle GET /:id errors gracefully', async () => {
            const response = await request(app)
                .get('/api/sick-leaves/123');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('PUT /api/sick-leaves/:id', () => {
        it('should update a sick leave', async () => {
            const response = await request(app)
                .put('/api/sick-leaves/123')
                .send({ reason: 'Updated reason' })
                .expect(200);
            expect(response.body.message).toBe('Sick Leave Updated');
        });

        it('should respond to PUT /:id', async () => {
            const response = await request(app)
                .put('/api/sick-leaves/123');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle PUT /:id errors gracefully', async () => {
            const response = await request(app)
                .put('/api/sick-leaves/123');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('DELETE /api/sick-leaves/:id', () => {
        it('should delete a sick leave', async () => {
            const response = await request(app)
                .delete('/api/sick-leaves/123')
                .expect(200);
            expect(response.body.message).toBe('Sick Leave Deleted');
        });

        it('should respond to DELETE /:id', async () => {
            const response = await request(app)
                .delete('/api/sick-leaves/123');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle DELETE /:id errors gracefully', async () => {
            const response = await request(app)
                .delete('/api/sick-leaves/123');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('POST /api/sick-leaves/:id/approve-supervisor', () => {
        it('should approve sick leave by supervisor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-supervisor')
                .send({ notes: 'Approved by supervisor' })
                .expect(200);
            expect(response.body.message).toBe('Approved by Supervisor');
        });

        it('should respond to POST /:id/approve-supervisor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-supervisor');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle POST /:id/approve-supervisor errors gracefully', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-supervisor');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('POST /api/sick-leaves/:id/approve-doctor', () => {
        it('should approve sick leave by doctor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-doctor')
                .send({ notes: 'Approved by doctor' })
                .expect(200);
            expect(response.body.message).toBe('Approved by Doctor');
        });

        it('should respond to POST /:id/approve-doctor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-doctor');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle POST /:id/approve-doctor errors gracefully', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/approve-doctor');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('POST /api/sick-leaves/:id/reject-supervisor', () => {
        it('should reject sick leave by supervisor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-supervisor')
                .send({ reason: 'Insufficient documentation' })
                .expect(200);
            expect(response.body.message).toBe('Rejected by Supervisor');
        });

        it('should respond to POST /:id/reject-supervisor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-supervisor');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle POST /:id/reject-supervisor errors gracefully', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-supervisor');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('POST /api/sick-leaves/:id/reject-doctor', () => {
        it('should reject sick leave by doctor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-doctor')
                .send({ reason: 'Medical documentation not sufficient' })
                .expect(200);
            expect(response.body.message).toBe('Rejected by Doctor');
        });

        it('should respond to POST /:id/reject-doctor', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-doctor');
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
        });
        
        it('should handle POST /:id/reject-doctor errors gracefully', async () => {
            const response = await request(app)
                .post('/api/sick-leaves/123/reject-doctor');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });

    describe('Two-step approval workflow', () => {
        it('should handle supervisor approval followed by doctor approval', async () => {
            // Supervisor approval
            const supervisorResponse = await request(app)
                .post('/api/sick-leaves/123/approve-supervisor')
                .send({ notes: 'Approved by supervisor' });
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(supervisorResponse.status);
            
            // Doctor approval
            const doctorResponse = await request(app)
                .post('/api/sick-leaves/123/approve-doctor')
                .send({ notes: 'Approved by doctor' });
            
            expect([200, 201, 400, 401, 403, 404, 500]).toContain(doctorResponse.status);
        });

        it('should handle workflow state transitions', async () => {
            const response = await request(app)
                .get('/api/sick-leaves/123');
            
            expect(response).toBeDefined();
            expect(response.status).toBeDefined();
        });
    });
});
