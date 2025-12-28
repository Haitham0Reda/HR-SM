/**
 * @fileoverview Repository pattern exports
 * Central export point for all repository classes and utilities
 */

import BaseRepository from './BaseRepository.js';
import GenericRepository from './GenericRepository.js';
import QueryBuilder from './QueryBuilder.js';

// Core HR Model Repositories
import {
    UserRepository,
    DepartmentRepository,
    PositionRepository,
    TenantConfigRepository
} from './core/index.js';

// Module Repositories
import AttendanceRepository from './modules/AttendanceRepository.js';
import PayrollRepository from './modules/PayrollRepository.js';
import VacationRepository from './modules/VacationRepository.js';
import TaskRepository from './modules/TaskRepository.js';
import DocumentRepository from './modules/DocumentRepository.js';
import MissionRepository from './modules/MissionRepository.js';
import OvertimeRepository from './modules/OvertimeRepository.js';

export {
    BaseRepository,
    GenericRepository,
    QueryBuilder,
    // Core repositories
    UserRepository,
    DepartmentRepository,
    PositionRepository,
    TenantConfigRepository,
    // Module repositories
    AttendanceRepository,
    PayrollRepository,
    VacationRepository,
    TaskRepository,
    DocumentRepository,
    MissionRepository,
    OvertimeRepository
};

export default {
    BaseRepository,
    GenericRepository,
    QueryBuilder,
    // Core repositories
    UserRepository,
    DepartmentRepository,
    PositionRepository,
    TenantConfigRepository,
    // Module repositories
    AttendanceRepository,
    PayrollRepository,
    VacationRepository,
    TaskRepository,
    DocumentRepository,
    MissionRepository,
    OvertimeRepository
};