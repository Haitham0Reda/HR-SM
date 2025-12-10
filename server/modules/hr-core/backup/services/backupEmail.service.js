/**
 * Backup Email Service
 * Sends backup files via email using the unified email service
 */
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import emailService from './email.service.js';

class BackupEmailService {
    /**
     * Create a zip file from backup files
     */
    async createZipFile(backupPath, backupFile, outputPath) {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(outputPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', () => {
                resolve(outputPath);
            });

            archive.on('error', (err) => reject(err));
            archive.pipe(output);

            // Check if backupPath is a directory or file
            fs.stat(backupPath).then(stats => {
                if (stats.isDirectory()) {
                    archive.directory(backupPath, false);
                } else {
                    archive.file(backupPath, { name: backupFile });
                }
                archive.finalize();
            }).catch(reject);
        });
    }

    /**
     * Send backup via email
     */
    async sendBackupEmail(backup, execution, recipientEmail) {
        try {

            // Create a temporary zip file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const zipFileName = `backup-${backup.name.replace(/\s+/g, '-')}-${timestamp}.zip`;
            const zipFilePath = path.join('backups', 'temp', zipFileName);

            // Ensure temp directory exists
            await fs.mkdir(path.join('backups', 'temp'), { recursive: true });

            // Create zip file
            await this.createZipFile(execution.backupPath, execution.backupFile, zipFilePath);

            // Get file size
            const stats = await fs.stat(zipFilePath);
            const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

            // Check if file is too large for email (most email servers limit to 25MB)
            if (stats.size > 25 * 1024 * 1024) {
                await this.sendBackupNotification(backup, execution, recipientEmail, true);
                await fs.unlink(zipFilePath); // Clean up
                return;
            }

            // Send email with attachment
            const result = await emailService.sendEmail({
                to: recipientEmail,
                subject: `✅ Backup Completed: ${backup.name}`,
                html: this.generateEmailHTML(backup, execution, fileSizeMB),
                attachments: [
                    {
                        filename: zipFileName,
                        path: zipFilePath
                    }
                ]
            });

            // Clean up temp file
            await fs.unlink(zipFilePath);

            return result;
        } catch (error) {

            return null;
        }
    }

    /**
     * Send notification without attachment (for large files)
     */
    async sendBackupNotification(backup, execution, recipientEmail, tooLarge = false) {
        try {
            const result = await emailService.sendEmail({
                to: recipientEmail,
                subject: `✅ Backup Completed: ${backup.name}`,
                html: this.generateNotificationHTML(backup, execution, tooLarge)
            });

            return result;
        } catch (error) {

            return null;
        }
    }

    /**
     * Generate email HTML with backup details
     */
    generateEmailHTML(backup, execution, fileSizeMB) {
        const duration = execution.duration ? `${(execution.duration / 1000).toFixed(2)}s` : 'N/A';
        const backupSizeMB = execution.backupSize ? (execution.backupSize / 1024 / 1024).toFixed(2) : 'N/A';
        const compressedSizeMB = execution.compressedSize ? (execution.compressedSize / 1024 / 1024).toFixed(2) : 'N/A';

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .success { color: #4caf50; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .attachment-note { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Backup Completed Successfully</h1>
        </div>
        <div class="content">
            <div class="info-box">
                <h2 style="margin-top: 0; color: #1976d2;">Backup Information</h2>
                <div class="info-row">
                    <span class="label">Backup Name:</span>
                    <span class="value">${backup.name}</span>
                </div>
                <div class="info-row">
                    <span class="label">Type:</span>
                    <span class="value">${backup.backupType.toUpperCase()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Status:</span>
                    <span class="value success">${execution.status.toUpperCase()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Completed At:</span>
                    <span class="value">${new Date(execution.endTime).toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="label">Duration:</span>
                    <span class="value">${duration}</span>
                </div>
            </div>

            <div class="info-box">
                <h2 style="margin-top: 0; color: #1976d2;">Backup Details</h2>
                <div class="info-row">
                    <span class="label">Original Size:</span>
                    <span class="value">${backupSizeMB} MB</span>
                </div>
                <div class="info-row">
                    <span class="label">Compressed Size:</span>
                    <span class="value">${compressedSizeMB} MB</span>
                </div>
                <div class="info-row">
                    <span class="label">Zip File Size:</span>
                    <span class="value">${fileSizeMB} MB</span>
                </div>
                <div class="info-row">
                    <span class="label">Encrypted:</span>
                    <span class="value">${execution.isEncrypted ? '✅ Yes' : '❌ No'}</span>
                </div>
                ${execution.itemsBackedUp ? `
                <div class="info-row">
                    <span class="label">Collections:</span>
                    <span class="value">${execution.itemsBackedUp.collections || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Total Documents:</span>
                    <span class="value">${execution.itemsBackedUp.totalDocuments || 'N/A'}</span>
                </div>
                ` : ''}
            </div>

            <div class="attachment-note">
                <strong>📎 Attachment:</strong> The backup file is attached to this email as a ZIP archive.
                <br><br>
                <strong>⚠️ Important:</strong> Store this backup in a secure location. The backup is encrypted and requires the encryption key to restore.
            </div>

            <p style="color: #666; font-size: 14px;">
                This is an automated backup from your HR Management System. 
                The backup includes your database and uploaded files.
            </p>
        </div>
        <div class="footer">
            <p>HR Management System - Automated Backup Service</p>
            <p>This email was sent automatically. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate notification HTML (without attachment)
     */
    generateNotificationHTML(backup, execution, tooLarge) {
        const duration = execution.duration ? `${(execution.duration / 1000).toFixed(2)}s` : 'N/A';
        const backupSizeMB = execution.backupSize ? (execution.backupSize / 1024 / 1024).toFixed(2) : 'N/A';

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; }
        .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .warning-box { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Backup Completed</h1>
        </div>
        <div class="content">
            ${tooLarge ? `
            <div class="warning-box">
                <strong>⚠️ File Too Large:</strong> The backup file (${backupSizeMB} MB) exceeds the email attachment limit (25 MB).
                <br><br>
                Please access the backup file directly from the server at: <code>${execution.backupPath}</code>
            </div>
            ` : ''}
            
            <div class="info-box">
                <h2>Backup: ${backup.name}</h2>
                <p><strong>Status:</strong> ${execution.status}</p>
                <p><strong>Completed:</strong> ${new Date(execution.endTime).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${duration}</p>
                <p><strong>Size:</strong> ${backupSizeMB} MB</p>
            </div>

            <p>Access your backup files from the HR System dashboard or server location.</p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

export default new BackupEmailService();
