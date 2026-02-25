const mongoose = require('mongoose');

const stepOutputSchema = new mongoose.Schema({
    step: { type: String, required: true },
    stepLabel: { type: String, required: true },
    output: { type: String, required: true },
}, { _id: false });

const runSchema = new mongoose.Schema({
    // Owner — scopes all history queries to the authenticated user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    workflowId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Workflow',
        required: true,
    },
    workflowName: {
        type: String,
        required: true,
    },
    input: {
        type: String,
        required: [true, 'Input text is required'],
    },
    steps: {
        type: [String],
        required: true,
    },
    stepOutputs: {
        type: [stepOutputSchema],
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Run', runSchema);
