const mongoose = require('mongoose');

const VALID_STEPS = ['clean', 'summarize', 'keypoints', 'tag'];

const stepSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        enum: VALID_STEPS,
    },
    label: {
        type: String,
        required: true,
    },
}, { _id: false });

const workflowSchema = new mongoose.Schema({
    // Owner — used to scope all queries so users only see their own workflows
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Workflow name is required'],
        trim: true,
        maxlength: [100, 'Name must be 100 characters or less'],
    },
    steps: {
        type: [stepSchema],
        validate: [
            {
                validator: (steps) => steps.length >= 2 && steps.length <= 4,
                message: 'Workflow must have between 2 and 4 steps',
            },
            {
                validator: (steps) => {
                    const keys = steps.map((s) => s.key);
                    return new Set(keys).size === keys.length;
                },
                message: 'All steps must be unique',
            },
        ],
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Workflow', workflowSchema);
