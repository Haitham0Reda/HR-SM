# License Server Database Separation

## Overview
The license server now uses a separate database from the main HR-SM application to improve security, performance, and maintainability.

## Database Configuration

### License Server Database
- **Database Name**: `hrsm_license_db` (production) / `hrsm_license_db_dev` (development)
- **Username**: `devhaithammoreda_db_user`
- **Password**: `Jj9BcW2KPu4qLLWr`
- **Connection String**: `mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrsm_license_db?retryWrites=true&w=majority`

### Main HR-SM Database
- **Database Name**: `hrms`
- **Username**: `devhaithammoreda_db_user`
- **Password**: `cvF50PEZvfPVmKU3`
- **Connection String**: `mongodb+srv://devhaithammoreda_db_user:cvF50PEZvfPVmKU3@cluster.uwhj601.mongodb.net/hrms?retryWrites=true&w=majority`

## Benefits of Separation

1. **Security**: License data is isolated from main application data
2. **Performance**: Reduced database load and improved query performance
3. **Scalability**: License server can be scaled independently
4. **Backup Strategy**: Different backup policies for license vs. operational data
5. **Access Control**: Granular database access permissions

## Files Updated

- `hrsm-license-server/.env` - Updated with new database credentials
- `hrsm-license-server/.env.example` - Updated example configuration
- `hrsm-license-server/ecosystem.config.js` - Updated PM2 configuration

## Migration Notes

If you have existing license data in the main database, you'll need to:

1. Export license-related collections from `hrms`
2. Import them into the new `hrsm_license_db`
3. Update any references in the main application

## Environment Variables

Make sure these environment variables are set in your license server:

```bash
MONGODB_URI=mongodb+srv://devhaithammoreda_db_user:Jj9BcW2KPu4qLLWr@cluster.uwhj601.mongodb.net/hrsm_license_db?retryWrites=true&w=majority
```

## Testing

The license server will automatically connect to the new database on startup. Check the logs for successful connection:

```
✅ MongoDB connected successfully to: mongodb+srv://...hrsm_license_db
```