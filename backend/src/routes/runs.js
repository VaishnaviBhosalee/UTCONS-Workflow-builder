const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const Workflow = require('../models/Workflow');
const Run = require('../models/Run');
const { callLLM, sleep } = require('../services/llm');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── Validation chains ──────────────────────────────────────

const executeRunValidation = [
    body('workflowId')
        .notEmpty().withMessage('workflowId is required')
        .isMongoId().withMessage('workflowId must be a valid ID'),

    body('input')
        .notEmpty().withMessage('Input text is required')
        .isString().withMessage('Input must be a string')
        .isLength({ min: 1, max: 10000 }).withMessage('Input must be between 1 and 10,000 characters'),
];

// ── All routes require authentication ──────────────────────
router.use(auth);

// POST /api/runs — Execute a workflow against input text
router.post('/', executeRunValidation, validate, async (req, res) => {
    const { workflowId, input } = req.body;

    // Fetch workflow — must belong to the authenticated user
    let workflow;
    try {
        workflow = await Workflow.findOne({ _id: workflowId, userId: req.user.id });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch workflow', details: error.message });
    }

    const stepOutputs = [];
    let currentText = input.trim();

    // Execute each step sequentially
    for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];

        // ≥1s delay between consecutive LLM calls to respect rate limits
        if (i > 0) {
            await sleep(1000);
        }

        try {
            console.log(`[user:${req.user.id}] Executing step ${i + 1}/${workflow.steps.length}: ${step.key}`);
            const output = await callLLM(step.key, currentText);

            stepOutputs.push({
                step: step.key,
                stepLabel: step.label,
                output,
            });

            currentText = output;
        } catch (error) {
            console.error(`Step ${step.key} failed:`, error.message);
            return res.status(502).json({
                error: `Step "${step.label}" failed: ${error.message}`,
                completedSteps: stepOutputs,
            });
        }
    }

    // Persist the run
    try {
        const run = new Run({
            userId: req.user.id,
            workflowId: workflow._id,
            workflowName: workflow.name,
            input: input.trim(),
            steps: workflow.steps.map((s) => s.key),
            stepOutputs,
        });

        await run.save();
        res.status(201).json(run);
    } catch (error) {
        console.error('Failed to save run:', error.message);
        res.status(201).json({
            userId: req.user.id,
            workflowId: workflow._id,
            workflowName: workflow.name,
            input: input.trim(),
            steps: workflow.steps.map((s) => s.key),
            stepOutputs,
            warning: 'Run completed but could not be saved to history',
        });
    }
});

// GET /api/runs — Last 5 runs for the authenticated user only
router.get('/', async (req, res) => {
    try {
        const runs = await Run.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        res.json(runs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch run history', details: error.message });
    }
});

module.exports = router;
