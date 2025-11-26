/**
 * File export utilities using JSZip
 * Handles bulk file downloads and ZIP creation
 */
import JSZip from 'jszip';

/**
 * Helper function to download blob as file
 */
const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

/**
 * Create a ZIP file from multiple files
 */
export const createZipFromFiles = async (files, zipName = 'download.zip') => {
    try {
        const zip = new JSZip();
        
        // Add files to ZIP
        for (const file of files) {
            if (file.content) {
                zip.file(file.name, file.content);
            } else if (file.url) {
                // For URLs, fetch the content first
                const response = await fetch(file.url);
                const blob = await response.blob();
                zip.file(file.name, blob);
            }
        }
        
        // Generate ZIP file
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, zipName);
        
        return { success: true };
    } catch (error) {
        console.error('Error creating ZIP:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export documents as ZIP
 */
export const exportDocumentsAsZip = async (documents, zipName = 'documents.zip') => {
    const files = documents.map(doc => ({
        name: doc.fileName || `${doc.title}.pdf`,
        url: doc.fileUrl || doc.url
    }));
    
    return createZipFromFiles(files, zipName);
};

/**
 * Export reports as ZIP with JSON data
 */
export const exportReportsAsZip = async (reports, zipName = 'reports.zip') => {
    try {
        const zip = new JSZip();
        
        reports.forEach((report, index) => {
            const fileName = report.name || `report_${index + 1}.json`;
            const content = JSON.stringify(report.data, null, 2);
            zip.file(fileName, content);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, zipName);
        
        return { success: true };
    } catch (error) {
        console.error('Error exporting reports:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export user data as ZIP (CSV + JSON)
 */
export const exportUserDataAsZip = async (users, zipName = 'users.zip') => {
    try {
        const zip = new JSZip();
        
        // Add JSON file
        zip.file('users.json', JSON.stringify(users, null, 2));
        
        // Add CSV file
        if (users.length > 0) {
            const headers = Object.keys(users[0]).join(',');
            const rows = users.map(user => 
                Object.values(user).map(val => 
                    typeof val === 'string' && val.includes(',') ? `"${val}"` : val
                ).join(',')
            );
            const csv = [headers, ...rows].join('\n');
            zip.file('users.csv', csv);
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, zipName);
        
        return { success: true };
    } catch (error) {
        console.error('Error exporting user data:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Export attendance records as ZIP
 */
export const exportAttendanceAsZip = async (attendanceData, zipName = 'attendance.zip') => {
    try {
        const zip = new JSZip();
        
        // Group by month
        const byMonth = attendanceData.reduce((acc, record) => {
            const month = new Date(record.date).toISOString().slice(0, 7);
            if (!acc[month]) acc[month] = [];
            acc[month].push(record);
            return acc;
        }, {});
        
        // Create a file for each month
        Object.entries(byMonth).forEach(([month, records]) => {
            const content = JSON.stringify(records, null, 2);
            zip.file(`attendance_${month}.json`, content);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        downloadBlob(content, zipName);
        
        return { success: true };
    } catch (error) {
        console.error('Error exporting attendance:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Download single file
 */
export const downloadFile = (content, fileName, mimeType = 'text/plain') => {
    try {
        const blob = new Blob([content], { type: mimeType });
        downloadBlob(blob, fileName);
        return { success: true };
    } catch (error) {
        console.error('Error downloading file:', error);
        return { success: false, error: error.message };
    }
};

export default {
    createZipFromFiles,
    exportDocumentsAsZip,
    exportReportsAsZip,
    exportUserDataAsZip,
    exportAttendanceAsZip,
    downloadFile
};
