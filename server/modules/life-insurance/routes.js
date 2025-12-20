import express from 'express';
import insuranceRoutes from './routes/insuranceRoutes.js';

const router = express.Router();

// Mount all life insurance routes
router.use('/', insuranceRoutes);

export default router;