import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { getWorkflows, executeRun } from '../api'

const STEP_COLORS = {
    clean: { border: 'border-blue-700/50', bg: 'bg-blue-900/20', text: 'text-blue-300', badge: 'bg-blue-900/50 text-blue-300', icon: '✨' },
    summarize: { border: 'border-emerald-700/50', bg: 'bg-emerald-900/20', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-300', icon: '📝' },
    keypoints: { border: 'border-purple-700/50', bg: 'bg-purple-900/20', text: 'text-purple-300', badge: 'bg-purple-900/50 text-purple-300', icon: '🎯' },
    tag: { border: 'border-orange-700/50', bg: 'bg-orange-900/20', text: 'text-orange-300', badge: 'bg-orange-900/50 text-orange-300', icon: '🏷️' },
}

function StepNode({ stepOutput, index, isActive, isDone }) {
    const colors = STEP_COLORS[stepOutput?.step] || STEP_COLORS.clean
    return (
        <div
            className={clsx(
                'card border-2 transition-all duration-500',
                isDone
                    ? clsx(colors.border, colors.bg)
                    : isActive
                        ? 'border-brand-600/70 bg-brand-900/20'
                        : 'border-gray-800 opacity-50'
            )}
        >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-3">
                <div
                    className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                        isDone
                            ? clsx(colors.badge)
                            : isActive
                                ? 'bg-brand-700 text-white animate-pulse-slow'
                                : 'bg-gray-800 text-gray-500'
                    )}
                >
                    {isDone ? '✓' : isActive ? <span className="animate-spin inline-block">◌</span> : index + 1}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span>{colors.icon}</span>
                        <span className="font-semibold text-sm">{stepOutput?.stepLabel}</span>
                    </div>
                    <p className="text-xs text-gray-500">{isDone ? 'Completed' : isActive ? 'Processing...' : 'Pending'}</p>
                </div>
            </div>

            {/* Output */}
            {isDone && stepOutput?.output && (
                <div className="mt-2 animate-fade-in">
                    <div className={clsx('rounded-lg p-3 border text-sm leading-relaxed whitespace-pre-wrap', colors.bg, colors.border, colors.text)}>
                        {stepOutput.output}
                    </div>
                </div>
            )}

            {isActive && !isDone && (
                <div className="flex items-center gap-2 text-brand-400 text-sm mt-2">
                    <span className="inline-block w-4 h-4 border-2 border-brand-700 border-t-brand-400 rounded-full animate-spin" />
                    AI is processing...
                </div>
            )}
        </div>
    )
}

export default function RunPage() {
    const [workflows, setWorkflows] = useState([])
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
    const [inputText, setInputText] = useState('')
    const [running, setRunning] = useState(false)
    const [activeStep, setActiveStep] = useState(-1)
    const [stepOutputs, setStepOutputs] = useState([])
    const [error, setError] = useState('')
    const [fetchingWorkflows, setFetchingWorkflows] = useState(true)

    useEffect(() => {
        getWorkflows()
            .then(setWorkflows)
            .catch(() => setError('Failed to load workflows.'))
            .finally(() => setFetchingWorkflows(false))
    }, [])

    const selectedWorkflow = workflows.find((w) => w._id === selectedWorkflowId)

    const handleRun = async () => {
        setError('')
        setStepOutputs([])
        setActiveStep(-1)

        if (!selectedWorkflowId) return setError('Please select a workflow.')
        if (!inputText.trim()) return setError('Please enter some input text.')

        setRunning(true)

        // Show each step sequentially as "active" while waiting for the backend
        // We simulate step-by-step display: show each node as pending first
        const steps = selectedWorkflow?.steps || []

        // Activate steps one by one visually while waiting
        let stepIndex = 0
        const stepInterval = setInterval(() => {
            if (stepIndex < steps.length) {
                setActiveStep(stepIndex)
                stepIndex++
            }
        }, 1500) // Update active indicator every ~1.5s

        try {
            const result = await executeRun({ workflowId: selectedWorkflowId, input: inputText })
            clearInterval(stepInterval)
            setActiveStep(-1)
            setStepOutputs(result.stepOutputs || [])
        } catch (err) {
            clearInterval(stepInterval)
            setActiveStep(-1)
            const data = err.response?.data
            if (data?.completedSteps) {
                setStepOutputs(data.completedSteps)
            }
            setError(data?.error || 'Pipeline execution failed. Please try again.')
        } finally {
            setRunning(false)
        }
    }

    const handleClear = () => {
        setStepOutputs([])
        setError('')
        setActiveStep(-1)
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Run Pipeline</h1>
                <p className="text-gray-400 mt-1">Select a workflow, enter your text, and watch each AI step process it sequentially.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Input Panel (left, 2/5 width) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Workflow selector */}
                    <div className="card">
                        <label className="label">Select Workflow</label>
                        {fetchingWorkflows ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                                <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
                                Loading...
                            </div>
                        ) : workflows.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">
                                No workflows found. <a href="/" className="text-brand-400 hover:underline">Create one first →</a>
                            </p>
                        ) : (
                            <select
                                className="input-field"
                                value={selectedWorkflowId}
                                onChange={(e) => { setSelectedWorkflowId(e.target.value); handleClear() }}
                            >
                                <option value="">-- Choose a workflow --</option>
                                {workflows.map((wf) => (
                                    <option key={wf._id} value={wf._id}>
                                        {wf.name} ({wf.steps.length} steps)
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Show pipeline steps */}
                        {selectedWorkflow && (
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <p className="text-xs text-gray-500 mb-2">Pipeline steps in order:</p>
                                <div className="flex flex-wrap gap-1 items-center">
                                    {selectedWorkflow.steps.map((step, i) => {
                                        const colors = STEP_COLORS[step.key]
                                        return (
                                            <div key={i} className="flex items-center gap-1">
                                                <span className={clsx('badge px-2 py-0.5 text-xs rounded border', colors.badge, colors.border)}>
                                                    {colors.icon} {step.label}
                                                </span>
                                                {i < selectedWorkflow.steps.length - 1 && (
                                                    <span className="text-gray-600 text-xs">→</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input text */}
                    <div className="card">
                        <label className="label">Input Text</label>
                        <textarea
                            className="input-field resize-none"
                            rows={10}
                            placeholder="Paste or type the text you want to process through the pipeline..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={running}
                        />
                        <p className="text-xs text-gray-500 mt-1">{inputText.length} characters</p>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
                            <span className="mt-0.5">⚠</span> <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={handleRun}
                            disabled={running || !selectedWorkflowId || !inputText.trim()}
                            className="btn-primary flex-1 justify-center py-3"
                        >
                            {running ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>▶ Execute Pipeline</>
                            )}
                        </button>
                        {stepOutputs.length > 0 && !running && (
                            <button onClick={handleClear} className="btn-secondary px-4">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Pipeline Visualizer (right, 3/5 width) */}
                <div className="lg:col-span-3">
                    <h2 className="text-lg font-semibold text-white mb-4">Pipeline Output</h2>

                    {!running && stepOutputs.length === 0 && activeStep === -1 && (
                        <div className="card flex flex-col items-center justify-center h-64 text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-3xl">▶</div>
                            <div>
                                <p className="text-gray-400 font-medium">Ready to execute</p>
                                <p className="text-gray-600 text-sm mt-1">Select a workflow and enter text to begin</p>
                            </div>
                        </div>
                    )}

                    {/* During execution — show all steps from selected workflow */}
                    {running && selectedWorkflow && (
                        <div className="space-y-4">
                            {selectedWorkflow.steps.map((step, i) => {
                                const completed = stepOutputs.find(s => s.step === step.key)
                                return (
                                    <div key={step.key}>
                                        <StepNode
                                            stepOutput={completed || { step: step.key, stepLabel: step.label }}
                                            index={i}
                                            isActive={i === activeStep}
                                            isDone={!!completed}
                                        />
                                        {i < selectedWorkflow.steps.length - 1 && (
                                            <div className="flex justify-center my-2">
                                                <div className="text-brand-500 text-lg animate-bounce">↓</div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* After execution — show results */}
                    {!running && stepOutputs.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                            {stepOutputs.map((stepOutput, i) => (
                                <div key={i}>
                                    <StepNode
                                        stepOutput={stepOutput}
                                        index={i}
                                        isActive={false}
                                        isDone={true}
                                    />
                                    {i < stepOutputs.length - 1 && (
                                        <div className="flex justify-center my-2">
                                            <div className="text-brand-500 text-lg font-bold">↓</div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Final output highlight */}
                            <div className="card-glow mt-6">
                                <h3 className="text-sm font-medium text-brand-400 mb-2">✨ Final Output</h3>
                                <div className="text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
                                    {stepOutputs[stepOutputs.length - 1]?.output}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
