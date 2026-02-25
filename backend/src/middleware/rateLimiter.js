const rateLimit = require('express-rate-limit');

// Skip rate limiting during tests
const isTest = process.env.NODE_ENV === 'test';

const noopMiddleware = (req, res, next) => next();

/**
 * Strict rate limiter for auth routes.
 * 10 requests per 15 minutes per IP — prevents brute-force attacks.
 */
const authLimiter = isTest
    ? noopMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many attempts from this IP. Please try again after 15 minutes.' },
    });

/**
 * General API rate limiter.
 * 100 requests per 15 minutes per IP.
 */
const apiLimiter = isTest
    ? noopMiddleware
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests from this IP. Please try again later.' },
    });

module.exports = { authLimiter, apiLimiter };
