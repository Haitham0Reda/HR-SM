// Report generation utilities for client-side report creation
import * as XLSX from 'xlsx';

/**
 * Generate and download monthly attendance report as Excel file
 */
export const generateMonthlyAttendanceExcel = (attendanceData, month, year) => {
    try {
        // Create workbook
        const workbook = XLSX.utils.book_new();
        
        // Prepare data for Excel
        const excelData = attendanceData.map(record => ({
            'Employee ID': record.employee?.employeeId || 'N/A',
            'Employee Name': record.employee?.personalInfo?.fullName || 
                           record.employee?.username || 'Unknown',
            'Department': record.department?.name || 'N/A',
            'Position': record.position?.title || 'N/A',
            'Date': new Date(record.date).toLocaleDateString(),
            'Check In': record.checkIn?.time ? 
                       new Date(record.checkIn.time).toLocaleTimeString() : 'N/A',
            'Check Out': record.checkOut?.time ? 
                        new Date(record.checkOut.time).toLocaleTimeString() : 'N/A',
            'Status': record.status || 'N/A',
            'Hours Worked': record.hours?.actual || 0,
            'Expected Hours': record.hours?.expected || 0,
            'Overtime': record.hours?.overtime || 0,
            'Late': record.checkIn?.isLate ? 'Yes' : 'No',
            'Early Leave': record.checkOut?.isEarly ? 'Yes' : 'No',
            'Notes': record.notes || ''
        }));

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const columnWidths = [
            { wch: 12 }, // Employee ID
            { wch: 20 }, // Employee Name
            { wch: 15 }, // Department
            { wch: 15 }, // Position
            { wch: 12 }, // Date
            { wch: 12 }, // Check In
            { wch: 12 }, // Check Out
            { wch: 10 }, // Status
            { wch: 12 }, // Hours Worked
            { wch: 15 }, // Expected Hours
            { wch: 10 }, // Overtime
            { wch: 8 },  // Late
            { wch: 12 }, // Early Leave
            { wch: 30 }  // Notes
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');

        // Generate summary sheet
        const summary = generateAttendanceSummary(attendanceData);
        const summaryWorksheet = XLSX.utils.json_to_sheet([summary]);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

        // Generate filename
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
        const filename = `Monthly_Attendance_Report_${monthName}_${year}.xlsx`;

        // Download file
        XLSX.writeFile(workbook, filename);
        
        return {
            success: true,
            filename,
            recordCount: attendanceData.length
        };
    } catch (error) {
        console.error('Error generating Excel report:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Generate attendance summary statistics
 */
const generateAttendanceSummary = (attendanceData) => {
    const summary = {
        'Total Records': attendanceData.length,
        'Present Days': 0,
        'Absent Days': 0,
        'Late Days': 0,
        'Early Leave Days': 0,
        'Total Hours Worked': 0,
        'Total Expected Hours': 0,
        'Total Overtime Hours': 0,
        'Average Attendance Rate': 0
    };

    let workingDays = 0;
    let presentDays = 0;

    attendanceData.forEach(record => {
        if (record.isWorkingDay) {
            workingDays++;
        }

        if (record.status === 'present' || record.status === 'on-time' || record.status === 'late') {
            presentDays++;
            summary['Present Days']++;
        } else if (record.status === 'absent') {
            summary['Absent Days']++;
        }

        if (record.checkIn?.isLate) {
            summary['Late Days']++;
        }

        if (record.checkOut?.isEarly) {
            summary['Early Leave Days']++;
        }

        summary['Total Hours Worked'] += record.hours?.actual || 0;
        summary['Total Expected Hours'] += record.hours?.expected || 0;
        summary['Total Overtime Hours'] += record.hours?.overtime || 0;
    });

    // Calculate attendance rate
    if (workingDays > 0) {
        summary['Average Attendance Rate'] = `${((presentDays / workingDays) * 100).toFixed(1)}%`;
    }

    // Round hours to 2 decimal places
    summary['Total Hours Worked'] = Math.round(summary['Total Hours Worked'] * 100) / 100;
    summary['Total Expected Hours'] = Math.round(summary['Total Expected Hours'] * 100) / 100;
    summary['Total Overtime Hours'] = Math.round(summary['Total Overtime Hours'] * 100) / 100;

    return summary;
};

/**
 * Generate and download monthly attendance report as PDF (client-side)
 */
export const generateMonthlyAttendancePDF = async (attendanceData, month, year) => {
    try {
        // For client-side PDF generation, we'll use jsPDF if available
        // Otherwise, we'll create a printable HTML version
        
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
        const summary = generateAttendanceSummary(attendanceData);
        
        // Create HTML content for PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Monthly Attendance Report - ${monthName} ${year}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .summary { margin-bottom: 30px; }
                    .summary table { width: 100%; border-collapse: collapse; }
                    .summary th, .summary td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .summary th { background-color: #f2f2f2; }
                    .attendance-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    .attendance-table th, .attendance-table td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                    .attendance-table th { background-color: #f2f2f2; }
                    .page-break { page-break-before: always; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Monthly Attendance Report</h1>
                    <h2>${monthName} ${year}</h2>
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="summary">
                    <h3>Summary</h3>
                    <table>
                        ${Object.entries(summary).map(([key, value]) => 
                            `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`
                        ).join('')}
                    </table>
                </div>
                
                <div class="page-break"></div>
                
                <h3>Detailed Attendance Records</h3>
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Date</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Status</th>
                            <th>Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendanceData.map(record => `
                            <tr>
                                <td>${record.employee?.employeeId || 'N/A'}</td>
                                <td>${record.employee?.personalInfo?.fullName || record.employee?.username || 'Unknown'}</td>
                                <td>${record.department?.name || 'N/A'}</td>
                                <td>${new Date(record.date).toLocaleDateString()}</td>
                                <td>${record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : 'N/A'}</td>
                                <td>${record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : 'N/A'}</td>
                                <td>${record.status || 'N/A'}</td>
                                <td>${record.hours?.actual || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background-color: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Print Report
                    </button>
                </div>
            </body>
            </html>
        `;
        
        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        return {
            success: true,
            message: 'PDF report opened in new window. Use browser print function to save as PDF.'
        };
    } catch (error) {
        console.error('Error generating PDF report:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Generate CSV report
 */
export const generateMonthlyAttendanceCSV = (attendanceData, month, year) => {
    try {
        const headers = [
            'Employee ID',
            'Employee Name', 
            'Department',
            'Position',
            'Date',
            'Check In',
            'Check Out',
            'Status',
            'Hours Worked',
            'Expected Hours',
            'Overtime',
            'Late',
            'Early Leave',
            'Notes'
        ];

        const csvData = attendanceData.map(record => [
            record.employee?.employeeId || 'N/A',
            record.employee?.personalInfo?.fullName || record.employee?.username || 'Unknown',
            record.department?.name || 'N/A',
            record.position?.title || 'N/A',
            new Date(record.date).toLocaleDateString(),
            record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : 'N/A',
            record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : 'N/A',
            record.status || 'N/A',
            record.hours?.actual || 0,
            record.hours?.expected || 0,
            record.hours?.overtime || 0,
            record.checkIn?.isLate ? 'Yes' : 'No',
            record.checkOut?.isEarly ? 'Yes' : 'No',
            record.notes || ''
        ]);

        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        // Create and download file
        const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' });
        const filename = `Monthly_Attendance_Report_${monthName}_${year}.csv`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return {
            success: true,
            filename,
            recordCount: attendanceData.length
        };
    } catch (error) {
        console.error('Error generating CSV report:', error);
        return {
            success: false,
            error: error.message
        };
    }
};