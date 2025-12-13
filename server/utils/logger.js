import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getLoggerForTenant } from './companyLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist (only if not in test mode)
const isTest = process.env.NODE_ENV === 'test';
const logToFile = process.env.LOG_TO_FILE !== 'false';
const logsDir = path.join(__dirname, '../../logs');

if (!isTest && logToFile && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Daily rotate file transport (only if not in test mode)
const dailyRotateTransport = !isTest && logToFile ? new DailyRotateFile({
    filename: path.join(logsDir, '%DATE%-application.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '10d',
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    )
}) : null;

// Error log transport (only if not in test mode)
const errorRotateTransport = !isTest && logToFile ? new DailyRotateFile({
    filename: path.join(logsDir, '%DATE%-error.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '10d',
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
    )
}) : null;

// Console transport for development
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
    )
});

// Create logger
const transports = [consoleTransport];
if (dailyRotateTransport) transports.push(dailyRotateTransport);
if (errorRotateTransport) transports.push(errorRotateTransport);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports,
    exitOnError: false
});

// Add helper method for company-specific logging
logger.forCompany = function(tenantId, companyName = null) {
    return getLoggerForTenant(tenantId, companyName);
};

export default logger;
