import express from 'express';
import {
    getAllPayrolls,
    createPayroll,
    getPayrollById,
    updatePayroll,
    deletePayroll
} from '../controller/payroll.controller.js';

const router = express.Router();

router.get('/', getAllPayrolls);
router.post('/', createPayroll);
router.get('/:id', getPayrollById);
router.put('/:id', updatePayroll);
router.delete('/:id', deletePayroll);

export default router;
