// Jest setup file for license server tests
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY_PATH = './keys/private.pem';
process.env.JWT_PUBLIC_KEY_PATH = './keys/public.pem';
process.env.DISABLE_DATABASE_CONNECTION = 'true';