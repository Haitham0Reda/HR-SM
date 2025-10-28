import express from 'express';
import {
    getAllDepartments,
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} from '../controller/department.controller.js';

const router = express.Router();

router.get('/', getAllDepartments);
router.post('/', createDepartment);
router.get('/:id', getDepartmentById);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

export default router;
