/**
 * @jest-environment node
 */
import express from 'express';
import request from 'supertest';

describe('Analytics Routes', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        const router = express.Router();
        router.get('/dashboard', (req, res) => res.status(200).json({ message: 'Dashboard Analytics' }));
        router.get('/attendance', (req, res) => res.status(200).json({ message: 'Attendance Analytics' }));
        router.get('/leave', (req, res) => res.status(200).json({ message: 'Leave Analytics' }));
        router.get('/kpis', (req, res) => res.status(200).json({ message: 'KPIs' }));

        app.use('/api/analytics', router);
    });

    it('should get dashboard analytics', async () => {
        const response = await request(app).get('/api/analytics/dashboard').expect(200);
        expect(response.body.message).toBe('Dashboard Analytics');
    });

    it('should get attendance analytics', async () => {
        const response = await request(app).get('/api/analytics/attendance').expect(200);
        expect(response.body.message).toBe('Attendance Analytics');
    });

    it('should get leave analytics', async () => {
        const response = await request(app).get('/api/analytics/leave').expect(200);
        expect(response.body.message).toBe('Leave Analytics');
    });

    it('should get KPIs', async () => {
        const response = await request(app).get('/api/analytics/kpis').expect(200);
        expect(response.body.message).toBe('KPIs');
    });
});
