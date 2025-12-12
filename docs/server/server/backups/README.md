# Backup Directory

This directory stores all system backups.

## Structure

```
backups/
├── database/          # Database-only backups
├── files/             # File-only backups
├── full/              # Full system backups (database + files)
├── configuration/     # Configuration file backups
└── incremental/       # Incremental backups
```

## Automatic Backups

The system is configured to run automatic backups twice daily:

- **1:00 AM** - Full backup (database + files)
- **6:00 AM** - Full backup (database + files)

## Backup Features

- **Encryption**: AES-256-CBC encryption enabled
- **Compression**: gzip compression (level 6)
- **Retention**: 30 days (automatic cleanup)
- **Max Backups**: 60 backups retained

## File Naming

Backup files follow this naming convention:
- `database-YYYY-MM-DDTHH-MM-SS.gz.enc`
- `files-YYYY-MM-DDTHH-MM-SS.tar.gz`
- `full-YYYY-MM-DDTHH-MM-SS/` (directory with multiple files)

## Setup

To configure the automatic backups, run:
```bash
npm run setup-backups
```

## Manual Backup

You can also create backups manually from the UI:
1. Navigate to `/app/backups`
2. Click "Create Backup Now"

## Restore

To restore from a backup, use the backup management interface or contact your system administrator.

## Storage Location

Default: `./server/backups/`

## Important Notes

- Backup files are encrypted and require the encryption key to restore
- Old backups are automatically deleted after 30 days
- Ensure sufficient disk space for backups
- Monitor backup execution logs for failures
