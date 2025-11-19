import logger from '../utils/logger.js';

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    logger.warn(`404 Not Found - ${req.originalUrl}`, {
        method: req.method,
        ip: req.ip
    });
    res.status(404);
    next(error);
};

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    logger.error(err.message, {
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: err.stack
    });

    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};
