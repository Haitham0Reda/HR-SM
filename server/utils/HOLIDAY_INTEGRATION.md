# Holiday Integration Documentation

## Overview
The attendance system now automatically detects and handles official holidays using the `date-holidays` package. This ensures that weekends (Saturday & Sunday for Egypt) and official holidays are automatically marked in attendance records.

## Features

### 1. Automatic Holiday Detection
- **Weekends**: Saturday and Sunday are automatically detected as weekends
- **Official Holidays**: National and religious holidays are detected using the `date-holidays` package
- **Country**: Currently configured for Egypt (EG)

### 2. Automatic Attendance Marking
When creating or updating attendance records:
- Weekend days (Saturday/Sunday) are automatically marked as "Official Holiday (Weekend)"
- Official holidays are marked with the holiday name (e.g., "Official Holiday (Eid al-Fitr)", "Official Holiday (Revolution Day)")
- Status is set to "absent"
- `isWorkingDay` is set to false
- Check-in/check-out times are cleared
- Working hours are set to 0

### 3. Integration Points

#### Backend
- **Model**: `server/models/attendance.model.js`
  - Pre-save hook automatically enforces holiday rules
  
- **Controller**: `server/controller/attendance.controller.js`
  - Validates holidays before creating/updating records
  
- **Utility**: `server/utils/holidayChecker.js`
  - Provides holiday checking functions
  
- **API Endpoints**: `server/routes/holiday.routes.js`
  - `GET /api/holidays/check?date=YYYY-MM-DD` - Check if a date is a holiday
  - `GET /api/holidays/year/:year` - Get all holidays for a year
  - `GET /api/holidays/working-day?date=YYYY-MM-DD` - Check if a date is a working day

#### Frontend
- **Utility**: `client/src/utils/holidayChecker.js`
  - Client-side holiday checking
  
- **Component**: `client/src/pages/attendance/AttendancePage.jsx`
  - Bulk create feature uses holiday checker
  - Shows working days vs holidays in summary

## Usage Examples

### Backend

```javascript
import { getHolidayInfo, isWorkingDay } from '../utils/holidayChecker.js';

// Check if a date is a holiday
const holidayInfo = getHolidayInfo('2024-12-25');
console.log(holidayInfo);
// {
//   date: Date,
//   isWeekend: false,
//   isHoliday: true,
//   isWorkingDay: false,
//   holidayName: 'Christmas Day',
//   holidayType: 'official-holiday',
//   note: 'Official Holiday (Christmas Day)'
// }

// Check if it's a working day
const isWorking = isWorkingDay('2024-12-25');
console.log(isWorking); // false
```

### Frontend

```javascript
import { getHolidayInfo } from '../../utils/holidayChecker';

// Check holiday status
const holidayInfo = getHolidayInfo('2024-12-25');
if (holidayInfo.isHoliday || holidayInfo.isWeekend) {
    console.log('This is a holiday:', holidayInfo.note);
}
```

## Configuration

### Changing Country
To change the country for holiday detection, edit the holiday checker files:

**Backend**: `server/utils/holidayChecker.js`
```javascript
const hd = new Holidays('US'); // Change 'EG' to your country code
```

**Frontend**: `client/src/utils/holidayChecker.js`
```javascript
const hd = new Holidays('US'); // Change 'EG' to your country code
```

### Supported Country Codes
- `EG` - Egypt (Current)
- `SA` - Saudi Arabia
- `US` - United States
- `GB` - United Kingdom
- `AE` - United Arab Emirates
- And many more... (see date-holidays package documentation)

### Changing Weekend Days
If your company has different weekend days, modify the `isWeekend` function:

**Current (Egypt)**: Saturday (6) and Sunday (0)
```javascript
export const isWeekend = (date) => {
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    // Saturday (6) and Sunday (0) for Egypt
    return dayOfWeek === 0 || dayOfWeek === 6;
};
```

**Example (Saudi Arabia)**: Friday (5) and Saturday (6)
```javascript
export const isWeekend = (date) => {
    const checkDate = new Date(date);
    const dayOfWeek = checkDate.getDay();
    // Friday (5) and Saturday (6) for Saudi Arabia
    return dayOfWeek === 5 || dayOfWeek === 6;
};
```

## Testing

### Test Holiday Detection
```bash
# Start the server
npm run server

# Test the API
curl http://localhost:5000/api/holidays/check?date=2024-12-25
curl http://localhost:5000/api/holidays/year/2024
curl http://localhost:5000/api/holidays/working-day?date=2024-12-25
```

### Test Attendance Creation
1. Try creating attendance for a Friday or Saturday
2. Verify it's automatically marked as "Official Holiday"
3. Try creating attendance for a known holiday
4. Verify it's marked with the holiday name

## Egyptian Holidays Included

The system automatically detects these Egyptian holidays:
- **New Year's Day** (January 1)
- **Coptic Christmas** (January 7)
- **Revolution Day** (January 25)
- **Sinai Liberation Day** (April 25)
- **Labour Day** (May 1)
- **Revolution Day (June 30)** (June 30)
- **Revolution Day (July 23)** (July 23)
- **Eid al-Fitr** (Islamic calendar - dates vary)
- **Eid al-Adha** (Islamic calendar - dates vary)
- **Islamic New Year** (Islamic calendar - dates vary)
- **Prophet's Birthday** (Islamic calendar - dates vary)
- **Armed Forces Day** (October 6)

## Notes

- The holiday detection happens at three levels: frontend, controller, and model
- This ensures data consistency regardless of where the record is created
- The `date-holidays` package is automatically updated with new holidays
- Weekend days (Saturday & Sunday) are always considered holidays regardless of official holiday status
- Islamic holidays follow the lunar calendar and dates vary each year
