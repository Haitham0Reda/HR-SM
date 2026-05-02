-- Create License Server Database
-- This script creates the hrsm_licenses database for the license server

-- Create database if it doesn't exist
CREATE DATABASE hrsm_licenses
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE hrsm_licenses IS 'HR-SM License Server Database - Stores license information and tenant metadata';
