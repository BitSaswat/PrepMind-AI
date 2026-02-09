const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const interviewRoutes = require('./routes/interviewRoutes');

const app = express();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// CORS Configuration - Allow production domains
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Allow localhost for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow Vercel deployments
        if (origin.includes('vercel.app') || origin.includes(process.env.FRONTEND_URL || '')) {
            return callback(null, true);
        }

        // Reject other origins
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// ============================================
// HEALTH CHECK ENDPOINTS (For Render + Pinger)
// ============================================

/**
 * Simple ping endpoint for cron-job.org pinger
 * This keeps the Render free tier server awake
 */
app.get('/ping', (req, res) => {
    res.status(200).send('Pong! I am awake.');
});

/**
 * Detailed health check endpoint
 * Returns server status, uptime, and environment info
 */
app.get('/health', (req, res) => {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // seconds
    const uptimeMinutes = Math.floor(uptime / 60);
    const uptimeSeconds = uptime % 60;

    res.status(200).json({
        status: 'healthy',
        uptime: `${uptimeMinutes}m ${uptimeSeconds}s`,
        uptimeSeconds: uptime,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Routes
app.use('/api', authRoutes);
app.use('/api', aiRoutes);
app.use('/api', interviewRoutes);

module.exports = app;
