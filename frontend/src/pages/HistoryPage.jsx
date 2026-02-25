import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { getRuns } from '../api'
import { format } from 'date-fns'

const STEP_COLORS = {
    clean: { border: 'border-blue-700/40', bg: 'bg-blue-900/15', text: 'text-blue-300', badge: 'bg-blue-900/50 text-blue-300', icon: '✨' },
    summarize: { border: 'border-emerald-700/40', bg: 'bg-emerald-900/15', text: 'text-emerald-300', badge: 'bg-emerald-900/50 text-emerald-300', icon: '📝' },
    keypoints: { border: 'border-purple-700/40', bg: 'bg-purple-900/15', text: 'text-purple-300', badge: 'bg-purple-900/50 text-purple-300', icon: '🎯' },
    tag: { border: 'border-orange-700/40', bg: 'bg-orange-900/15', text: 'text-orange-300', badge: 'bg-orange-900/50 text-orange-300', icon: '🏷️' },
}

function RunCard({ run, index }) {
    const [expanded, setExpanded] = useState(index === 0) // First run expanded by default

    return (
        <div className={clsx('card transition-all duration-200', expanded ? 'ring-1 ring-brand-800/50' : 'hover:border-gray-700')}>
            {/* Card Header */}
            <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-900/60 border border-brand-700/50 flex items-center justify-center text-brand-300 text-sm font-bold flex-shrink-0">
                                {index + 1}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-white truncate">{run.workflowName}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {format(new Date(run.createdAt), 'MMM d, yyyy · h:mm a')}
                                </p>
                            </div>
                        </div>

                        {/* Steps pills */}
                        <div className="flex flex-wrap gap-1.5 mt-3 ml-11">
                            {run.steps.map((stepKey, i) => {
                                const colors = STEP_COLORS[stepKey]
                                return (
                                    <div key={i} className="flex items-center gap-1">
                                        <span className={clsx('badge px-2 py-0.5 text-xs rounded border', colors?.badge, colors?.border)}>
                                            {colors?.icon} {stepKey}
                                        </span>
                                        {i < run.steps.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="badge bg-gray-800 text-gray-400 text-xs px-2 py-1">
                            {run.stepOutputs?.length} steps
                        </span>
                        <span className="text-gray-500 text-sm">{expanded ? '▲' : '▼'}</span>
                    </div>
                </div>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="mt-5 pt-5 border-t border-gray-800 space-y-4 animate-fade-in">
                    {/* Original input */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Original Input</p>
                        <div className="bg-gray-800/60 rounded-lg p-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-4">
                            {run.input}
                        </div>
                    </div>

                    {/* Step outputs */}
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Step Outputs</p>
                        <div className="space-y-3">
                            {run.stepOutputs?.map((so, i) => {
                                const colors = STEP_COLORS[so.step] || STEP_COLORS.clean
                                return (
                                    <div key={i}>
                                        <div className={clsx('rounded-lg border p-3', colors.border, colors.bg)}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span>{colors.icon}</span>
                                                <span className={clsx('text-xs font-semibold', colors.text)}>{so.stepLabel}</span>
                                            </div>
                                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{so.output}</p>
                                        </div>
                                        {i < run.stepOutputs.length - 1 && (
                                            <div className="flex justify-center my-1.5">
                                                <span className="text-brand-500 text-sm">↓</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function HistoryPage() {
    const [runs, setRuns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getRuns()
            .then(setRuns)
            .catch(() => setError('Failed to load run history.'))
            .finally(() => setLoading(false))
    }, [])

    const handleRefresh = () => {
        setLoading(true)
        setError('')
        getRuns()
            .then(setRuns)
            .catch(() => setError('Failed to load run history.'))
            .finally(() => setLoading(false))
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Run History</h1>
                    <p className="text-gray-400 mt-1">The last 5 pipeline executions with full step-by-step detail.</p>
                </div>
                <button onClick={handleRefresh} disabled={loading} className="btn-secondary">
                    {loading ? (
                        <span className="inline-block w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                    ) : '↺ '}
                    Refresh
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
                    <span>⚠</span> {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center h-60 gap-3">
                    <span className="inline-block w-8 h-8 border-2 border-gray-700 border-t-brand-500 rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Loading history...</p>
                </div>
            ) : runs.length === 0 ? (
                <div className="card flex flex-col items-center justify-center h-60 text-center gap-4">
                    <span className="text-5xl">◷</span>
                    <div>
                        <p className="text-gray-300 font-medium">No runs yet</p>
                        <p className="text-gray-500 text-sm mt-1">
                            Go to the <a href="/run" className="text-brand-400 hover:underline">Run page</a> to execute your first pipeline.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {runs.map((run, i) => (
                        <RunCard key={run._id} run={run} index={i} />
                    ))}
                    <p className="text-center text-xs text-gray-600 pt-2">Showing up to 5 most recent executions</p>
                </div>
            )}
        </div>
    )
}
