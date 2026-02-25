const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const Workflow = require('../models/Workflow');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const VALID_STEP_KEYS = ['clean', 'summarize', 'keypoints', 'tag'];

const STEP_LABELS = {
    clean: 'Clean Text',
    summarize: 'Summarize',
    keypoints: 'Extract Key Points',
    tag: 'Tag Category',
};

// ── Validation chains ──────────────────────────────────────

const createWorkflowValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Workflow name is required')
        .isLength({ max: 100 }).withMessage('Name must be 100 characters or less')
        .escape(), // Strip HTML/script tags

    body('steps')
        .isArray({ min: 2, max: 4 }).withMessage('Workflow must have between 2 and 4 steps'),

    body('steps.*')
        .isIn(VALID_STEP_KEYS)
        .withMessage(`Each step must be one of: ${VALID_STEP_KEYS.join(', ')}`),
];

// ── All routes require authentication ──────────────────────
router.use(auth);

// GET /api/workflows — list only the authenticated user's workflows
router.get('/', async (req, res) => {
    try {
        const workflows = await Workflow.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(workflows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workflows', details: error.message });
    }
});

// GET /api/workflows/:id — get a single workflow owned by this user
router.get('/:id', [
    param('id').isMongoId().withMessage('Invalid workflow ID'),
], validate, async (req, res) => {
    try {
        const workflow = await Workflow.findOne({ _id: req.params.id, userId: req.user.id });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch workflow', details: error.message });
    }
});

// POST /api/workflows — create a new workflow for this user
router.post('/', createWorkflowValidation, validate, async (req, res) => {
    try {
        const { name, steps } = req.body;

        // Sanitize: ensure steps is an array of strings (after escaping arrays can contain objects)
        const stepArray = Array.isArray(steps) ? steps.map(String) : [];

        // Duplicate step check (validator only checks each element individually)
        if (new Set(stepArray).size !== stepArray.length) {
            return res.status(400).json({ error: 'All steps must be unique' });
        }

        const stepObjects = stepArray.map((key) => ({ key, label: STEP_LABELS[key] }));

        const workflow = new Workflow({
            userId: req.user.id,
            name: name.trim(),
            steps: stepObjects,
        });

        await workflow.save();
        res.status(201).json(workflow);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        res.status(500).json({ error: 'Failed to create workflow', details: error.message });
    }
});

// DELETE /api/workflows/:id — delete only if owned by this user
router.delete('/:id', [
    param('id').isMongoId().withMessage('Invalid workflow ID'),
], validate, async (req, res) => {
    try {
        const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!workflow) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json({ message: 'Workflow deleted successfully', id: req.params.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete workflow', details: error.message });
    }
});

module.exports = router;
