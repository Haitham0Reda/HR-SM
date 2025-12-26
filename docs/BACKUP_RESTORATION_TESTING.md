# Backup Restoration Testing

This document describes the comprehensive backup restoration testing system implemented for the HR-SM Enterprise platform.

## Overview

The backup restoration testing system validates that backup files can be successfully restored and that all system components function correctly after restoration. This ensures business continuity and data protection compliance.

## Features

### Comprehensive Testing
- **Backup Extraction**: Validates backup files can be located, decrypted, and extracted
- **Database Restoration**: Tests restoration of both main (hrms) and license (hrsm-licenses) databases
- **File System Restoration**: Verifies file uploads and application code restoration
- **Configuration Restoration**: Tests restoration of configuration files for both backends
- **RSA Keys Restoration**: Validates encrypted RSA key restoration and functionality
- **Data Integrity**: Verifies data completeness and relationships after restoration
- **Application Functionality**: Optional testing of application startup and basic functionality

### Test Phases

1. **Backup Extraction and Validation**
   - Locate backup file
   - Decrypt backup content
   - Extract backup components
   - Validate backup manifest

2. **Database Restoration Test**
   - Restore main database (hrms)
   - Restore license database (hrsm-licenses)
   - Verify database connections
   - Validate database structure

3. **File System Restoration Test**
   - Restore uploads directory
   - Verify file integrity
   - Test file permissions

4. **Configuration Restoration Test**
   - Restore main application configuration
   - Restore license server configuration
   - Test configuration completeness

5. **RSA Keys Restoration Test**
   - Decrypt and extract RSA keys
   - Validate key format and integrity
   - Test key functionality

6. **Data Integrity Verification**
   - Verify database checksums
   - Validate data relationships
   - Check data completeness

7. **Application Functionality Test** (Optional)
   - Test main backend functionality
   - Test license server functionality
   - Test database connectivity
   - Test basic API endpoints

## Usage

### Command Line Interface

```bash
# Test latest backup
npm run test-backup-restoration

# Test specific backup with full functionality test
npm run test-backup-restoration:full -- --backup-id daily-backup-2024-01-15

# Show recent test history
npm run test-backup-restoration:report

# Test with verbose output
node scripts/test-backup-restoration.js --verbose

# Test specific backup
node scripts/test-backup-restoration.js --backup-id <backup-id>

# Run full test including application functionality
node scripts/test-backup-restoration.js --full
```

### Programmatic Usage

```javascript
import BackupRestorationTest from './server/services/backupRestorationTest.js';

const restorationTest = new BackupRestorationTest();

// Run comprehensive restoration test
const testReport = await restorationTest.runRestorationTest(backupId, {
    testApplicationFunctionality: true
});

console.log('Test Result:', testReport.overallResult);
console.log('Phases:', testReport.phases.length);
```

## Test Results

### Result Types
- **passed**: All tests completed successfully
- **warning**: Tests completed with minor issues
- **failed**: Critical tests failed

### Test Report Structure
```json
{
    "testId": "restoration-test-1234567890",
    "backupId": "daily-backup-2024-01-15",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:05:00.000Z",
    "status": "completed",
    "overallResult": "passed",
    "phases": [
        {
            "name": "Backup Extraction and Validation",
            "status": "passed",
            "startTime": "2024-01-15T10:00:00.000Z",
            "endTime": "2024-01-15T10:01:00.000Z",
            "tests": [...]
        }
    ],
    "recommendations": [
        {
            "type": "performance",
            "message": "Consider optimizing backup size"
        }
    ]
}
```

## Integration with Backup Verification

The restoration testing is integrated with the existing backup verification system:

```javascript
// Backup verification now includes restoration testing
const verificationReport = await backupVerificationSystem.runComprehensiveVerification(
    backupId,
    { includeRestorationTest: true }
);
```

## Automated Scheduling

Restoration tests can be scheduled to run automatically:

```javascript
// Enable restoration testing in backup verification schedule
const verificationSchedule = {
    daily: true,
    weekly: true,
    monthly: true,
    restorationTest: true  // Enable restoration testing
};
```

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 8.1**: Automated backup verification scripts that test restore procedures
- **Requirement 8.3**: Database repair procedures and restoration from clean backups
- **Requirement 8.5**: Verification scripts for disaster recovery scenarios
- **Requirement 12.1**: Automated backup verification scripts that test restore procedures and data integrity

## Security Considerations

- Restoration tests use staging environments to avoid affecting production data
- RSA keys are tested for functionality without exposing private key content
- Test environments are automatically cleaned up after completion
- All test activities are logged for audit purposes

## Performance Considerations

- Tests are designed to complete within 30 minutes for typical backup sizes
- Staging directories are automatically cleaned up to conserve disk space
- Database restoration tests use simulation to avoid resource-intensive operations
- Full application functionality tests are optional and can be skipped for faster testing

## Troubleshooting

### Common Issues

1. **Backup file not found**
   - Verify backup ID is correct
   - Check backup directory permissions
   - Ensure backup completed successfully

2. **Decryption failures**
   - Verify backup encryption key is correct
   - Check backup file integrity
   - Ensure backup was created with same encryption settings

3. **Database connection issues**
   - Verify MongoDB is running
   - Check database connection strings
   - Ensure proper database permissions

4. **Test timeout**
   - Increase test timeout for large backups
   - Check system resources (CPU, memory, disk)
   - Consider running tests during off-peak hours

### Logs and Debugging

Test logs are written to:
- `logs/backup-restoration-test.log` - Detailed test execution logs
- `backups/restoration-test/verification/` - Test reports and results

Enable verbose logging for detailed debugging:
```bash
node scripts/test-backup-restoration.js --verbose
```

## Best Practices

1. **Regular Testing**: Run restoration tests weekly or monthly
2. **Full Tests**: Perform full functionality tests quarterly
3. **Monitor Results**: Review test reports and recommendations
4. **Update Procedures**: Keep restoration procedures updated based on test results
5. **Document Issues**: Document and track any restoration issues found during testing

## Future Enhancements

Planned improvements include:
- Integration with monitoring systems for automated alerts
- Support for partial restoration testing
- Performance benchmarking and optimization
- Integration with cloud storage restoration testing
- Automated rollback testing procedures