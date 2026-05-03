# Task 13: Controller Refactoring Plan

## Status Summary

### ✅ Already Using Repositories (No Changes Needed)
1. **UserController** → UserService → UserRepository ✓
2. **AttendanceController** → AttendanceService → AttendanceRepository ✓
3. **VacationController** (Leave) → VacationService → (needs verification)

### 🔧 Needs Refactoring
1. **PayrollController** - Uses direct Mongoose model access, needs to use PayrollService
2. **TaskController** - Needs verification and potential refactoring
3. **DocumentController** - Needs verification and potential refactoring
4. **NotificationController** - Needs verification and potential refactoring
5. **MissionController** - Needs verification and potential refactoring
6. **OvertimeController** - Needs verification and potential refactoring
7. **HolidayController** - Needs verification and potential refactoring
8. **SurveyController** - Needs verification and potential refactoring
9. **EventController** - Needs verification and potential refactoring
10. **ClinicController** - Needs verification and potential refactoring
11. **InsuranceController** (Life Insurance module) - Needs verification and potential refactoring

## Refactoring Order (as specified)
1. UserController ✓ (already done)
2. AttendanceController ✓ (already done)
3. LeaveController (VacationController) - verify
4. PayrollController - **NEEDS REFACTORING**
5. Remaining modules

## Next Steps
1. Refactor PayrollController to use PayrollService
2. Verify and refactor remaining controllers
3. Run Jest tests after each refactoring
4. Update task status in tasks.md
