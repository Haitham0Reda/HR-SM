# Complete Physical File Restructuring - Movement Plan

## Overview

This document provides a.

## File Movement Categories

### Category 1: HR-Core Module Files (Priority 1)


#### Controllers → `server/modules/hr-core/*/controllers/`

b-module |
|-------------|-------------|------------|
| `server/controller/attendance.controller.js` | `server/modules/hr-core/attendance/controllce |
| `server/controller/auth.controller.js` | `server/modules/hr-core/auth/controllers/auth.controll
| `s |
ce |
| `server/controller/holidayys |
| `ns |
| `server/controller/mixedVacation.controller.js` | `server/modules/hr-core/vacations/controllerss |
me |
| `server/controller/position.controller.js` | `server/modules/hr-cos |
| ` |

| `server/controllens |
| `ckup |

#### Models → `server/modules/hr-core/*/models/`

| Legacy Path | Target Path | Sub-module |
|-------------|-------------|------------|
| `server/models/attendance.model.js` | `server/modules/hr-core/attendance/models/attendance.model.js` | attendance |
| `server/models/department.model.js` | `server/modules/hr-core/users/models/department.model.js` | users |
| `server/models/forgetCheck.model.js` | `server/modules/hr-core/attendance/models/forgetCheck.model.js` | attendance |
| `server/models/holiday.model.js` | `server/modules/hr-core/holidays/models/holiday.model.js` | holidays |
| `server/models/mission.model.js` | `server/modules/hr-core/missions/models/mission.model.js` | missions |
| `server/models/mixedVacation.model.js` | `server/modules/hr-core/vacations/models/mixedVacation.model.js`  |

| `server/models/position.model.js` | `server/modules/hr-core/users/models/posiusers |
| `server/models/request.model.js` | `server/modules/hr-core/requests/models/request.model.sts |
| `server/models/requestControl.model.js` | `server/modules/hr-core/requests/models/req
| `server/models/user.model.js` | `server/modules/hr-core/users/models/user.mod
| `server/models/vacation.model.js` | `server/modules/hr-core/vacations/models/vacation.mod|
| `server/models/vacationBalance.model.js` | `server/modules/hr-core/vacations/models/vacatio
| `server/models/backup.model.js` | `server/modules/hr-core/backup/models/backup.model.js` | backup |
| `server/models/backupExecution.model.js` | `server/modules/hr-core/backup/models/backupExec

#### Routes → `server/modules/hr-core/*/routes.js` (merge into existing)

| Legacy Path | Target Path | Action |
|-------------|-------------|--------|
| `server/routes/attendance.routes.js` | `server/modules/hr-core/attendance/routes. |
e |
| `server/routes/department.routes.js` | `server/modules/hr-core/users/routes.jse |
| `server/routes/forgetCheck.routes.js` | `server/modules/hr-core/attendance/routes.jserge |
| `server/routes/holiday.routes.js` | `server/modules/hr-core/holidays/routes.js` | e |
| `server/routes/mission.routes.js` | `server/modules/hr-core/missions/routes.js |
| `server/routes/mixedVacation.routes.js` | `server/modules/hr-core/vacations/routes.j
| `server/routes/overtime.routes.js` | `server/modules/hr-core/overtime/routes.js` | merge |
| `server/routes/position.routes.js` | `server/modules/hr-core/users/routes.js` | merge |
| `server/routes/request.routes.js` | `server/modules/hr-core/requests/routes.js` | merge
| `server/routes/user.routes.js` | `server/modules/hr-core/users/routes.js` | merge |
| `server/routes/vacation.routes.js` | `server/modules/hr-core/vacations/routes.js` | merge 
| `new |


###2)
These files belong to modules that already exist and have some structure.

#### Analytics Module

| Legacy Path | Target Path |
|-------|
|
| `server/routes/analy

#### Announcements Module

| Legacy Path | Target Path |
|
| `server/controller/announcement.controller.js` | `server/modules/announce.js` |
| `l.js` |
s` |

###e

| Legacy Path | Target Path |
|-------------|-------------|
r.js` |
| `server/models/dashboardConfig.model.js` | `server/modules/dashboard/models/dashboardConf|
| `server/routes/dashboard.routes.js` | `server/modules/dashboard/routes/dashboard.routes.js` |

#### Documents Module

| Legacy Path | Target Path |
|-------------|-------------|
| `server/controller/document.controller.js` | `server/modules/documents/controllers/docu|
| `` |

| `server/models/docums` |
| `|
| `server/models/hardcopy.model.js` | `server/modules/documents/models/hardcopy.model.js` |

| `server/models/idCardBatch.model.js` | `server/modules/documents/models/idCardBatch.mode|
 |
| `server/routes/documentTemplate.routes.js` | `server/modules/documents/rou
| `utes.js` |

#### Events Module

| Legacy Path | Target Path |
-|
| `server/controller/event.controller.js` | `server/modules/events/controllers/event.con
| `server/models/event.model.js` | `server/modules/events/models/event.model.js` |
 |

#### Notifications Module

h |
|-------------|----------|
| `.js` |
| `server/models/notification.model.js` | `server/modules/notifications/models/notification.model.js` |
| `server/routes/notification.routes.js` | `server/modules/notifications/routes/notification.routes.js` |

#### Payroll Module

h |
|-------------|-------------|
| `server/controller/payroll.controller.js` | `server/modules/payroll/controllers/payroll.co.js` |
| `s` |




| L |
|-------------|-------------|
| `server/controller/report.controller.js` | `server/modules/reports/controllers/report.controller.js` |

| `server/models/reportConfig.model.js` | `server/modules/reports/models/reportCons` |
| `server/models/reportExecution.model.js` | `server/modules/reports/models/reportExecution.|

| `server/routes/report.routes.js` | `server/modules/reports/routes/report.route` |

###

| Legacy Path | Target Path |
|--
| `server/controller/survey.controller.js` | `server/modules/surveys/controllers/survey.controller.js` |
| `server/controller/surveyNotification.controller.js` | `server/modules/surveys/controllers/surveyNotifi
 |
| `server/models/surveyNotification.model.js` | `server/modules/surveys/models/surve
| `` |

#### Tasks Module

| Legacy Path | Target Path |
---|
| `server/controller/task.controller.js` | `server/modules/tasks/controllers/.js` |
| `server/models/task.model.js` | `server/modules/tasks/models/task.model.js` |
| `odel.js` |


e

| L|
|-------------|-------------|
| `server/controller/theme.controller.js` | `server/modules/thejs` |
| `server/models/themeConfig.model.js` | `server/modules/theme/mo
| `server/routes/theme.routes.js` | `server/modules/theme/routes/them |

### Category 3: New Module Files (Priority 3)
These files need new modules created for them.



| L |
|-------------|-------------|
| `server/controller/attendanceDevice.controller.js` | `server/modules/attendance-devices/controllers/at
| `server/models/attendanceDevice.model.js` | `server/modules/attendance-devices/models/attendancjs` |
| `server/routes/attendanceDevice.routes.js` | `server/modules/attendance-devices/routes/attendanceDevice.rojs` |

#### Permissions Module (New)

|
|-------------|-------------|
| ` |
| `server/controller/permissionAudit.controller.js` | `server/modules/permissions/controllers/permissir.js` |
| `server/controller/permissions.controller.js` | `server/modules/permissions/controllers/permissions.controllr.js` |
| `server/models/permission.model.js` | `server/modules/permissions/models/permission.model.js` |
| `.js` |
s` |
| `server/models/permissions.model.j
| `js` |
| `server/routes/permissionAudit.routes.js` | `server/modules/permissions/routes/permissionAudit.s.js` |
| `
s.js` |

)

Path |
|-------------|----------
| `server/controller/securityAudit.controller.js` | s` |
| `server/control` |
| `server/models/securityAudit.m |
| `server/models/securitySettings.modeel.js` |
| `server/routes/securityAudit.route
| `server/routes/securitySetting` |

#### Roles Module (New)

| Legacy Path | Target Path |
|-------------|-------------|
| `server/controller/role.controller.js` | `` |
 |
| `server/routes/role.routes.|

#### Resigned Empw)

| Legacy Path | Target Path |
|-------------|-------------|

| `server/models/resignedEmplos` |
| `server/routes/resignedEmployee.routes.js` | `server/mos` |

#### Sick Leave Module (New)

| Legacy Path | Target Path |
------|
| `server/controller/sickLeaer.js` |
| `server/models/sickLeave.model.js` | `server/modules/js` |
| `server/routes/s.js` |

#### User Photos Module (New)

| Legacy Path | Target Path |
|-------------|-------------|
| `server/controljs` |
| `server/routes/userPhoto.routes.s` |

 NOT MOVE)
These files should remain in t

#### Platform Fil/)
- All files in `server/platform/` -
- License-related controllers and modelsm level)

- Pricing-related files (platform-nality)

#### Core Service)
- `server/services/alertManager.serm service
 service
- `server/services/databaserm service
- `server/services/dependencyResolver.service.ce
- `server/serviceice
- `server/services/featureFlag.serve
- `server/services/licenseFileLoader.see
 service
- `server/services/licenseWebSvice
rvice
- `server/services/redis.servrvice
- `server/serce
- `server/service

#### Platform Controllers (Keep in current locations)
- `server/controller/license.controller.js` - Platform-level functionality
y
- `server/contry
- `server/controller/subscription.controller.js` - Platform-level functionality

#### Platform Routes (Keep in current locations)
- `ionality

- `server/routes/license
- `server/rou
- `server/routelity
- `server/routes/subscription.routes.js` - ity

#### Platform Models (Keep in current locations)
y
- `server/modelity
- `server/models/usageTracking.model.js` - Platform-level functioty
- `server/models/organization.model.js` - Platform-level functionality (tenant-relad)

## 

### Phase 1: Preparation
1. Create bac
2. Ensure all tsing
3. Create new module directories as needed
4. Document current import dependencies

### Phase 2: HR Risk)
1. Move HR-Core controllers (batch 1)
2. Update imports for moved controllers
3. 

5. Update imports for moved models

7. Move and merge HR-Core routes (batch 3)
8. Update route registrations in app.js
9. Test HR-Core functionality

sk)
1. Move files to existing ime)
2. Update imports after each module
mpletion

### Phase 4: New Modules (Higher Risk)
1. Create new module directories
2. Move files to new modules (one module at a time)
3. Create module.config.js for each new module
le
5. s


### Phase 5: Cleanup
1. Remove empty legacy directories documentaticess.prooughout the ionality thr functystemining snta and maiing riskinimiz while mstructuringcal file re the physiingmpletch to cotic approaa systemaes  plan provid
Thisxt phase
or necheckpoint fe Creat ] untered
- [sues encont any isDocumely
- [ ] lity manualunctiona frify [ ] Vee tests
-ensivomprehun c- [ ] R Phase
fter Each### A arise

or issuesStop if maj log
- [ ] changeetailed Keep d] ch
- [ ch bater eat aft
- [ ] Tes batcheses in small] Move fil[ Phase
- ach ## During E
#uite
 sestRun full t
- [ ]  backupckpointheeate c
- [ ] Crworking state is sure currente
- [ ] Ench Phas## Before Ea

#itigationRisk M
## s
ll moduleizes a recognoperlyystem prdule sl
- [ ] Moionactle and funccessibroutes al 
- [ ] Alradationormance deg No perf [ ]e
-w structurreflects nentation ted documeUpda
- [ ] facts artith no legacyucture wictory strdireClean [ ] erved
- presy ionalitnctisting fuAll ex ] 
- [s pass All test
- [ ] errorss withoutn startpplicatio- [ ] Aectly
 corrworking and dateduprt paths ll impoons
- [ ] A locatite moduleto appropriaes moved cy filAll lega
- [ ] 
klistriteria ChecSuccess C## 

ade mgesl chaned log of alKeep detailase
- r each phk steps fot rollbacen
- Documentnt environmvelopmeedure on delback proct rolesesting
- Tlback T
### Rolgain
 aing movepte attemorssues befAddress inality
5. Test functiorations
4. gist route re. Updateles
3 those fihanges forh cpatt mporvert i. Reations
2y locgacback to lees lematic fil1. Move probs issues)
hadule specific molback (if artial Rol# P
##tionality
funcfy 4. Verication
 appliRestarte 1
3. has Pind ateckup crerom bastore fation
2. Rethe applic
1. Stop sues arise)r isf majoollback (i Immediate Rlan

### Pck# Rollba``

#s.js';
`ers/router-core/usdules/h../mos from 'teport userRoudel.js';
imr.mouses/rs/modelre/usees/hr-comodulm '../roserModel f';
import uler.jser.controls/userers/controll/hr-core/us./moduleser from '.rControllusept
import avascri
```j (Modular)
#### After
```
tes.js';er.rou../routes/usm 'tes frorRourt use
impoodel.js';s/user.model/ml from '..rt userMode;
impontroller.js'ler/user.coontrolfrom '../cntroller serComport uascript
i
```javegacy)# Before (Lates

### Pattern Upd
### Importaths
m legacy p froportse that imewar middl Anyhs
-dule patr new moates fo updes, needsll routs aegister.js` - Rrver/appates
- `sepd ueeds majorroutes, ncy ll legas a Importx.js` -indees/er/routrves
- `sependencisk Degh-Ri
### Hisis
ncy Analyde Depensting

##sive tel comprehen Finaon
3.
2. Update