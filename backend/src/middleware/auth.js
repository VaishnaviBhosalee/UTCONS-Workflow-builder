const jwt = require('jsonwebtoken');

/**
 * JWT authentication middleware.
 * Reads Bearer token from Authorization header, verifies it,
 * and attaches the decoded payload to req.user.
 */
const auth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-production');
        req.user = decoded; // { id, email, name }
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
};

module.exports = auth;
