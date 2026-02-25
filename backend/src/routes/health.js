const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { checkLLMHealth } = require('../services/llm');

// GET /api/health - Health check for backend, MongoDB, and LLM
router.get('/', async (req, res) => {
    const startTime = Date.now();

    // 1. Backend is always OK if we reach this handler
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            backend: { status: 'ok', message: 'Express server is running' },
            mongodb: { status: 'unknown' },
            llm: { status: 'unknown' },
        },
    };

    // 2. Check MongoDB connectivity
    try {
        const mongoState = mongoose.connection.readyState;
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        if (mongoState === 1) {
            // Ping the database to confirm
            await mongoose.connection.db.admin().ping();
            health.services.mongodb = { status: 'ok', message: 'MongoDB is connected' };
        } else {
            health.services.mongodb = {
                status: 'error',
                message: `MongoDB state: ${['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown'}`,
            };
        }
    } catch (error) {
        health.services.mongodb = { status: 'error', message: error.message };
    }

    // 3. Check LLM reachability
    const llmResult = await checkLLMHealth();
    health.services.llm = llmResult.reachable
        ? { status: 'ok', message: 'Gemini LLM is reachable', latencyMs: llmResult.latencyMs }
        : { status: 'error', message: llmResult.error || 'LLM is not reachable', latencyMs: llmResult.latencyMs };

    // Determine overall status
    const allOk = Object.values(health.services).every((s) => s.status === 'ok');
    health.status = allOk ? 'ok' : 'degraded';
    health.responseTimeMs = Date.now() - startTime;

    const httpStatus = allOk ? 200 : 503;
    res.status(httpStatus).json(health);
});

module.exports = router;
