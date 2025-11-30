# Attendance Seed Summary

## ✅ Seeding Completed Successfully!

### 📊 Statistics
- **Total Records Created**: 2,976
- **Total Users**: 48 active users
- **Date Range**: September 30, 2025 - November 30, 2025 (2 months)
- **Total Days**: 62 days
- **Working Days**: 44 days
- **Holidays/Weekends**: 18 days
- **Records per User**: 62 (one for each day)

### 🎯 What Was Generated

#### Working Days (44 days)
For each working day, the system generated realistic attendance with:
- **85% Present** - Normal attendance with check-in/check-out times
- **5% Late** - Late arrivals (up to 1 hour late)
- **5% Work From Home** - Remote work with WFH flag
- **5% Absent** - Absent with random reasons (sick, personal, etc.)

#### Holidays/Weekends (18 days)
- **Saturdays & Sundays** - Marked as "Official Holiday (Weekend)"
- **Egyptian Holidays** - Marked with specific holiday names
- All holidays have status "absent" and no check-in/check-out times

### ⏰ Time Variations
To make the data realistic:
- **Check-in times**: 09:00 ±15 minutes (on-time) or ±60 minutes (late)
- **Check-out times**: 17:00 ±30 minutes
- **Working hours**: Automatically calculated based on check-in/check-out
- **Overtime**: Calculated when working hours exceed 8 hours

### 📁 Seed Script Location
`server/scripts/seedAttendance.js`

### 🚀 How to Run Again

```bash
npm run seed-attendance
```

**Note**: Running the script again will:
1. Clear all existing attendance records for the 2-month period
2. Generate fresh attendance data
3. Respect Egyptian holidays and weekends

### ⚙️ Configuration

You can modify these settings in the seed script:

```javascript
const MONTHS_TO_SEED = 2; // Number of months to seed
const CHECK_IN_TIME = '09:00'; // Default check-in time
const CHECK_OUT_TIME = '17:00'; // Default check-out time
```

### 🎲 Attendance Distribution

The seed script generates realistic attendance patterns:

| Status | Probability | Description |
|--------|-------------|-------------|
| Present | 85% | Normal attendance with check-in/check-out |
| Late | 5% | Late arrival (up to 1 hour) |
| Work From Home | 5% | Remote work |
| Absent | 5% | Absent with reason |

### 📅 Egyptian Holidays Included

The seed automatically respects:
- **Weekends**: Saturday & Sunday
- **Official Holidays**: All Egyptian national and religious holidays
- **Islamic Holidays**: Eid al-Fitr, Eid al-Adha, etc. (dates vary by lunar calendar)

### ✨ Features

1. **Realistic Data**: Random variations in check-in/check-out times
2. **Holiday Aware**: Automatically detects and handles Egyptian holidays
3. **Department & Position**: Links attendance to user's department and position
4. **Working Hours**: Calculates actual hours, overtime, and total hours
5. **Work From Home**: Properly flags WFH attendance
6. **Absence Reasons**: Random realistic reasons for absences

### 🔍 Verify the Data

You can verify the seeded data by:
1. Opening the Attendance Management page
2. Filtering by date range (Sep 30 - Nov 30, 2025)
3. Checking individual user attendance records
4. Viewing the statistics and reports

### 📝 Notes

- The script uses the `date-holidays` package to detect Egyptian holidays
- All attendance records follow the same validation rules as manual entry
- The pre-save hook in the Attendance model ensures data consistency
- Weekends and holidays are automatically marked regardless of the generated status
