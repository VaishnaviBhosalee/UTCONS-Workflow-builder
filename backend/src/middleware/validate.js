const { validationResult } = require('express-validator');

/**
 * Middleware factory: runs validation chains, then short-circuits with 400 if any fail.
 * Usage:  router.post('/', [...validationChains], validate, handler)
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return first error per field for clean UX
        const formatted = errors.array({ onlyFirstError: true }).map((e) => ({
            field: e.path,
            message: e.msg,
        }));
        return res.status(400).json({
            error: 'Validation failed',
            details: formatted,
        });
    }
    next();
};

module.exports = validate;
