-- PostgreSQL Database Initialization Script
-- This script creates the two databases needed for the HR-SM migration:
-- 1. hrsm-licenses (License Server Database)
-- 2. hrsm_platform (Main Application Database)

-- Create License Server Database
CREATE DATABASE "hrsm-licenses"
    WITH 
    OWNER = hrms_admin
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE "hrsm-licenses" IS 'License Server Database - stores license information and tenant metadata';

-- Create Main Application Database
CREATE DATABASE hrsm_platform
    WITH 
    OWNER = hrms_admin
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE hrsm_platform IS 'Main Application Database - stores HR business data for all tenants';

-- Connect to License Server Database and set up extensions
\c "hrsm-licenses"

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone to UTC
ALTER DATABASE "hrsm-licenses" SET timezone TO 'UTC';

-- Connect to Main Application Database and set up extensions
\c hrsm_platform

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone to UTC
ALTER DATABASE hrsm_platform SET timezone TO 'UTC';

-- Grant all privileges to hrms_admin
GRANT ALL PRIVILEGES ON DATABASE "hrsm-licenses" TO hrms_admin;
GRANT ALL PRIVILEGES ON DATABASE hrsm_platform TO hrms_admin;

-- Success message
\echo 'PostgreSQL databases initialized successfully!'
\echo 'Databases created:'
\echo '  1. hrsm-licenses (License Server)'
\echo '  2. hrsm_platform (Main Application)'
\echo ''
\echo 'Extensions enabled:'
\echo '  - uuid-ossp (UUID generation)'
\echo '  - pgcrypto (encryption)'
\echo '  - pg_trgm (text search)'
\echo ''
\echo 'Timezone set to: UTC'
