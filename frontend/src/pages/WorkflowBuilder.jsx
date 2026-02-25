import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { getWorkflows, createWorkflow, deleteWorkflow } from '../api'

const STEP_OPTIONS = [
    { key: 'clean', label: 'Clean Text', description: 'Removes extra whitespace and fixes basic grammar.', icon: '✨', color: 'blue' },
    { key: 'summarize', label: 'Summarize', description: 'Condenses the input into ~5 lines.', icon: '📝', color: 'green' },
    { key: 'keypoints', label: 'Extract Key Points', description: 'Returns bullet-point insights.', icon: '🎯', color: 'purple' },
    { key: 'tag', label: 'Tag Category', description: 'Classifies text: Technology / Finance / Health / Education / Other.', icon: '🏷️', color: 'orange' },
]

const COLOR_MAP = {
    blue: 'border-blue-700/50 bg-blue-900/20 text-blue-300',
    green: 'border-emerald-700/50 bg-emerald-900/20 text-emerald-300',
    purple: 'border-purple-700/50 bg-purple-900/20 text-purple-300',
    orange: 'border-orange-700/50 bg-orange-900/20 text-orange-300',
}

const BADGE_MAP = {
    blue: 'bg-blue-900/50 text-blue-300',
    green: 'bg-emerald-900/50 text-emerald-300',
    purple: 'bg-purple-900/50 text-purple-300',
    orange: 'bg-orange-900/50 text-orange-300',
}

export default function WorkflowBuilder() {
    const [name, setName] = useState('')
    const [selectedSteps, setSelectedSteps] = useState([])
    const [workflows, setWorkflows] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchingWorkflows, setFetchingWorkflows] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetchWorkflows()
    }, [])

    const fetchWorkflows = async () => {
        try {
            setFetchingWorkflows(true)
            const data = await getWorkflows()
            setWorkflows(data)
        } catch (err) {
            setError('Failed to load workflows.')
        } finally {
            setFetchingWorkflows(false)
        }
    }

    const toggleStep = (key) => {
        setSelectedSteps((prev) => {
            if (prev.includes(key)) {
                return prev.filter((k) => k !== key)
            }
            if (prev.length >= 4) return prev
            return [...prev, key]
        })
        setError('')
    }

    const moveStep = (index, direction) => {
        const newSteps = [...selectedSteps]
        const target = index + direction
        if (target < 0 || target >= newSteps.length) return
            ;[newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]]
        setSelectedSteps(newSteps)
    }

    const handleSave = async () => {
        setError('')
        setSuccess('')

        if (!name.trim()) return setError('Please enter a workflow name.')
        if (selectedSteps.length < 2) return setError('Please select at least 2 steps.')
        if (selectedSteps.length > 4) return setError('Maximum 4 steps allowed.')

        try {
            setLoading(true)
            const workflow = await createWorkflow({ name: name.trim(), steps: selectedSteps })
            setWorkflows((prev) => [workflow, ...prev])
            setName('')
            setSelectedSteps([])
            setSuccess(`Workflow "${workflow.name}" saved successfully!`)
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save workflow.')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id, wfName) => {
        if (!confirm(`Delete workflow "${wfName}"?`)) return
        try {
            await deleteWorkflow(id)
            setWorkflows((prev) => prev.filter((w) => w._id !== id))
        } catch (err) {
            setError('Failed to delete workflow.')
        }
    }

    const getStepOption = (key) => STEP_OPTIONS.find((s) => s.key === key)

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Workflow Builder</h1>
                <p className="text-gray-400 mt-1">Design multi-step AI pipelines by selecting and ordering processing steps.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Create Form */}
                <div className="space-y-6">
                    {/* Name Input */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-white mb-4">1. Name Your Workflow</h2>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g. Article Analyzer, Blog Summarizer..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={100}
                        />
                        <p className="text-xs text-gray-500 mt-1.5">{name.length}/100 characters</p>
                    </div>

                    {/* Step Selector */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-white mb-1">2. Select Steps</h2>
                        <p className="text-sm text-gray-400 mb-4">Choose 2–4 unique steps. Click to toggle, drag handles to reorder.</p>
                        <div className="grid grid-cols-1 gap-3">
                            {STEP_OPTIONS.map((step) => {
                                const isSelected = selectedSteps.includes(step.key)
                                const stepIndex = selectedSteps.indexOf(step.key)
                                const isDisabled = !isSelected && selectedSteps.length >= 4
                                return (
                                    <div
                                        key={step.key}
                                        onClick={() => !isDisabled && toggleStep(step.key)}
                                        className={clsx(
                                            'relative flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
                                            isSelected
                                                ? COLOR_MAP[step.color]
                                                : isDisabled
                                                    ? 'border-gray-800 bg-gray-800/30 opacity-50 cursor-not-allowed'
                                                    : 'border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/60'
                                        )}
                                    >
                                        <span className="text-2xl">{step.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{step.label}</span>
                                                {isSelected && (
                                                    <span className={clsx('badge', BADGE_MAP[step.color])}>
                                                        Step {stepIndex + 1}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">{step.description}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => moveStep(stepIndex, -1)}
                                                    disabled={stepIndex === 0}
                                                    className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                                                    title="Move up"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => moveStep(stepIndex, 1)}
                                                    disabled={stepIndex === selectedSteps.length - 1}
                                                    className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition-colors"
                                                    title="Move down"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                                                <span className="text-white text-xs">✓</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Pipeline Preview */}
                    {selectedSteps.length > 0 && (
                        <div className="card-glow">
                            <h3 className="text-sm font-medium text-gray-400 mb-3">Pipeline Order</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {selectedSteps.map((key, i) => {
                                    const step = getStepOption(key)
                                    return (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className={clsx('badge px-3 py-1 border', COLOR_MAP[step.color])}>
                                                {step.icon} {step.label}
                                            </span>
                                            {i < selectedSteps.length - 1 && (
                                                <span className="text-brand-400 font-bold">→</span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Feedback */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
                            <span>⚠</span> {error}
                        </div>
                    )}
                    {success && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm animate-fade-in">
                            <span>✓</span> {success}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={loading || selectedSteps.length < 2}
                        className="btn-primary w-full justify-center py-3"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>Save Workflow</>
                        )}
                    </button>
                </div>

                {/* Right: Saved Workflows */}
                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Saved Workflows</h2>
                    {fetchingWorkflows ? (
                        <div className="flex items-center justify-center h-40 text-gray-500">
                            <span className="inline-block w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mr-2" />
                            Loading workflows...
                        </div>
                    ) : workflows.length === 0 ? (
                        <div className="card flex flex-col items-center justify-center h-48 text-center gap-3">
                            <span className="text-4xl">⚡</span>
                            <p className="text-gray-400 text-sm">No workflows yet. Create your first one!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {workflows.map((wf) => (
                                <div key={wf._id} className="card group hover:border-gray-700 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{wf.name}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Created {new Date(wf.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </p>
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {wf.steps.map((step, i) => {
                                                    const option = getStepOption(step.key)
                                                    return (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <span className={clsx('badge px-2 py-0.5 rounded-md border text-xs', COLOR_MAP[option?.color || 'blue'])}>
                                                                {option?.icon} {step.label}
                                                            </span>
                                                            {i < wf.steps.length - 1 && (
                                                                <span className="text-gray-600 text-xs">→</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(wf._id, wf.name)}
                                            className="btn-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete workflow"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
