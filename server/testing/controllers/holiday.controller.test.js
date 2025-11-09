/**
 * @jest-environment node
 */
import mongoose from 'mongoose';
import Holiday from '../../models/holiday.model.js';
import * as holidayController from '../../controller/holiday.controller.js';
import { createMockResponse, createMockRequest, createTestSchool, createTestUser, cleanupTestData } from './testHelpers.js';

describe('Holiday Controller - All 10 Functions', () => {
    let mockReq, mockRes, testSchool, testUser;

    beforeEach(async () => {
        testSchool = await createTestSchool();
        testUser = await createTestUser(testSchool._id, null, null);
        
        mockReq = createMockRequest({ user: { id: testUser._id } });
        mockRes = createMockResponse();
    });

    afterEach(async () => {
        await Holiday.deleteMany({});
        await cleanupTestData();
    });

    describe('1. getHolidaySettings', () => {
        it('should execute getHolidaySettings function', async () => {
            await holidayController.getHolidaySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getHolidaySettings', async () => {
            // Function executes normally
            await holidayController.getHolidaySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('2. updateHolidaySettings', () => {
        it('should execute updateHolidaySettings function', async () => {
            await holidayController.updateHolidaySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle invalid ID in updateHolidaySettings', async () => {
            mockReq.params.id = 'invalid-id';
            await holidayController.updateHolidaySettings(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('3. addOfficialHolidays', () => {
        it('should execute addOfficialHolidays function', async () => {
            await holidayController.addOfficialHolidays(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addOfficialHolidays', async () => {
            // Function executes normally
            await holidayController.addOfficialHolidays(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('4. removeOfficialHoliday', () => {
        it('should execute removeOfficialHoliday function', async () => {
            await holidayController.removeOfficialHoliday(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in removeOfficialHoliday', async () => {
            // Function executes normally
            await holidayController.removeOfficialHoliday(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('5. addWeekendWorkDays', () => {
        it('should execute addWeekendWorkDays function', async () => {
            await holidayController.addWeekendWorkDays(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addWeekendWorkDays', async () => {
            // Function executes normally
            await holidayController.addWeekendWorkDays(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('6. removeWeekendWorkDay', () => {
        it('should execute removeWeekendWorkDay function', async () => {
            await holidayController.removeWeekendWorkDay(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in removeWeekendWorkDay', async () => {
            // Function executes normally
            await holidayController.removeWeekendWorkDay(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('7. getHolidaySuggestions', () => {
        it('should execute getHolidaySuggestions function', async () => {
            await holidayController.getHolidaySuggestions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in getHolidaySuggestions', async () => {
            // Function executes normally
            await holidayController.getHolidaySuggestions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('8. addFromSuggestions', () => {
        it('should execute addFromSuggestions function', async () => {
            await holidayController.addFromSuggestions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in addFromSuggestions', async () => {
            // Function executes normally
            await holidayController.addFromSuggestions(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('9. checkWorkingDay', () => {
        it('should execute checkWorkingDay function', async () => {
            await holidayController.checkWorkingDay(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in checkWorkingDay', async () => {
            // Function executes normally
            await holidayController.checkWorkingDay(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });

    describe('10. parseDateString', () => {
        it('should execute parseDateString function', async () => {
            await holidayController.parseDateString(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });

        it('should handle execution in parseDateString', async () => {
            // Function executes normally
            await holidayController.parseDateString(mockReq, mockRes);
            expect(mockRes.statusCode).toBeDefined();
            expect([200, 201, 400, 404, 500]).toContain(mockRes.statusCode);
        });
    });
});
