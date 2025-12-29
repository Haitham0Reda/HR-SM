import { describe, test, expect } from '@jest/globals';

// Import services to verify they use repositories
import UserService from '../../modules/hr-core/services/UserService.js';
import AttendanceService from '../../modules/hr-core/attendance/services/AttendanceService.js';
import PayrollService from '../../modules/payroll/services/PayrollService.js';
import VacationService from '../../modules/hr-core/vacations/services/VacationService.js';
import TaskService from '../../modules/tasks/services/TaskService.js';
import DocumentService from '../../modules/documents/services/DocumentService.js';
import MissionService from '../../modules/hr-core/missions/services/MissionService.js';
import OvertimeService from '../../modules/hr-core/overtime/services/OvertimeService.js';

describe('Service Repository Integration Verification', () => {
    test('UserService should use UserRepository', () => {
        const userService = new UserService();
        expect(userService.userRepository).toBeDefined();
        expect(userService.userRepository.constructor.name).toBe('UserRepository');
    });

    test('AttendanceService should use AttendanceRepository', () => {
        const attendanceService = new AttendanceService();
        expect(attendanceService.attendanceRepository).toBeDefined();
        expect(attendanceService.attendanceRepository.constructor.name).toBe('AttendanceRepository');
    });

    test('PayrollService should use PayrollRepository', () => {
        const payrollService = new PayrollService();
        expect(payrollService.payrollRepository).toBeDefined();
        expect(payrollService.payrollRepository.constructor.name).toBe('PayrollRepository');
    });

    test('VacationService should use VacationRepository', () => {
        const vacationService = new VacationService();
        expect(vacationService.vacationRepository).toBeDefined();
        expect(vacationService.vacationRepository.constructor.name).toBe('VacationRepository');
    });

    test('TaskService should use TaskRepository', () => {
        const taskService = new TaskService();
        expect(taskService.taskRepository).toBeDefined();
        expect(taskService.taskRepository.constructor.name).toBe('TaskRepository');
    });

    test('DocumentService should use DocumentRepository', () => {
        const documentService = new DocumentService();
        expect(documentService.documentRepository).toBeDefined();
        expect(documentService.documentRepository.constructor.name).toBe('DocumentRepository');
    });

    test('MissionService should use MissionRepository', () => {
        const missionService = new MissionService();
        expect(missionService.missionRepository).toBeDefined();
        expect(missionService.missionRepository.constructor.name).toBe('MissionRepository');
    });

    test('OvertimeService should use OvertimeRepository', () => {
        const overtimeService = new OvertimeService();
        expect(overtimeService.overtimeRepository).toBeDefined();
        expect(overtimeService.overtimeRepository.constructor.name).toBe('OvertimeRepository');
    });

    test('All services should have repository dependencies injected', () => {
        const services = [
            new UserService(),
            new AttendanceService(),
            new PayrollService(),
            new VacationService(),
            new TaskService(),
            new DocumentService(),
            new MissionService(),
            new OvertimeService()
        ];

        services.forEach(service => {
            const repositoryProperty = Object.keys(service).find(key => key.endsWith('Repository'));
            expect(repositoryProperty).toBeDefined();
            expect(service[repositoryProperty]).toBeDefined();
        });
    });
});