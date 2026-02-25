const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const workflowRoutes = require('./routes/workflows');
const runRoutes = require('./routes/runs');
const healthRoutes = require('./routes/health');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// ── Security headers ──────────────────────────────────────
app.use(helmet({
  // Vite adds crossorigin to <script>/<link> tags — COEP blocks them
  crossOriginEmbedderPolicy: false,
  // Allow Google Fonts, inline styles, and Vite assets
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, same-origin)
    if (!origin) return callback(null, true);
    // Allow listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In unified deployment (production), frontend is same-origin — allow it
    if (process.env.NODE_ENV === 'production') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing & sanitization ───────────────────────────
app.use(express.json({ limit: '50kb' })); // Hard cap on request body size
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

// Strip $ and . from request body/query to prevent NoSQL injection
app.use(mongoSanitize());

// ── General API rate limiting ─────────────────────────────
app.use('/api/', apiLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/health', healthRoutes);

const fs = require('fs');

// ── Serve Frontend (unified deployment) ───────────────────
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  console.log('Serving frontend from:', frontendDist);
  app.use(express.static(frontendDist));

  // Any request that doesn't match an API route gets the React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.log('Frontend dist not found at:', frontendDist, '(skipping static serving)');
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  // Don't leak CORS errors or stack traces in production
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
});

// Only listen when running directly (not imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
