const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/** Generate a signed JWT for a user */
const signToken = (user) =>
    jwt.sign(
        { id: user._id.toString(), email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

// ── Validation chains ──────────────────────────────────────

const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 254 }).withMessage('Email is too long'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .isLength({ max: 72 }).withMessage('Password must be 72 characters or less')
        .matches(/(?=.*[a-zA-Z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
];

const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

// ── POST /api/auth/register ────────────────────────────────

router.post('/register', authLimiter, registerValidation, validate, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check for existing account
        const existing = await User.findOne({ email });
        if (existing) {
            // Generic message to avoid user enumeration
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const user = new User({ name, email });
        await user.setPassword(password);
        await user.save();

        const token = signToken(user);
        res.status(201).json({ token, user });
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ── POST /api/auth/login ───────────────────────────────────

router.post('/login', authLimiter, loginValidation, validate, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+passwordHash');

        // Constant-time comparison — same message for missing user OR wrong password
        const validPassword = user ? await user.verifyPassword(password) : false;

        if (!user || !validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = signToken(user);
        res.json({ token, user });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

module.exports = router;
