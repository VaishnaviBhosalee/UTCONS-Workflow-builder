import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { getHealth } from '../api'

function ServiceCard({ name, result, icon }) {
    const isOk = result?.status === 'ok'
    const isUnknown = !result

    return (
        <div
            className={clsx(
                'card border-2 transition-all duration-300',
                isUnknown
                    ? 'border-gray-700'
                    : isOk
                        ? 'border-emerald-700/50 bg-emerald-900/10'
                        : 'border-red-700/50 bg-red-900/10'
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div
                        className={clsx(
                            'w-10 h-10 rounded-xl flex items-center justify-center text-xl',
                            isUnknown ? 'bg-gray-800' : isOk ? 'bg-emerald-900/50' : 'bg-red-900/50'
                        )}
                    >
                        {icon}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">{name}</h3>
                        <p
                            className={clsx(
                                'text-sm mt-0.5',
                                isUnknown ? 'text-gray-500' : isOk ? 'text-emerald-400' : 'text-red-400'
                            )}
                        >
                            {isUnknown ? 'Checking...' : result?.message}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    {/* Status pill */}
                    <div
                        className={clsx(
                            'badge px-3 py-1 rounded-full font-medium text-xs',
                            isUnknown
                                ? 'bg-gray-800 text-gray-400'
                                : isOk
                                    ? 'bg-emerald-900/60 text-emerald-300'
                                    : 'bg-red-900/60 text-red-300'
                        )}
                    >
                        <span
                            className={clsx(
                                'status-dot mr-1.5',
                                isUnknown ? 'bg-gray-500' : isOk ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                            )}
                        />
                        {isUnknown ? 'Checking' : isOk ? 'Operational' : 'Error'}
                    </div>

                    {/* Latency */}
                    {result?.latencyMs !== undefined && (
                        <span className="text-xs text-gray-500">{result.latencyMs}ms</span>
                    )}
                </div>
            </div>

            {/* Error details */}
            {result?.status === 'error' && result?.message && (
                <div className="mt-3 pt-3 border-t border-red-900/40">
                    <p className="text-xs text-red-400/80 font-mono break-all">{result.message}</p>
                </div>
            )}
        </div>
    )
}

export default function HealthDashboard() {
    const [health, setHealth] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [lastChecked, setLastChecked] = useState(null)

    const checkHealth = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const data = await getHealth()
            setHealth(data)
            setLastChecked(new Date())
        } catch (err) {
            // Even on error, we might get partial data
            if (err.response?.data) {
                setHealth(err.response.data)
            } else {
                setError('Cannot reach the backend server. Make sure it is running on port 5000.')
            }
            setLastChecked(new Date())
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        checkHealth()
    }, [checkHealth])

    const overallOk = health?.status === 'ok'
    const services = health?.services || {}

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Health Dashboard</h1>
                    <p className="text-gray-400 mt-1">Live status of backend services and integrations.</p>
                </div>
                <button
                    onClick={checkHealth}
                    disabled={loading}
                    className="btn-primary"
                >
                    {loading ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '↺'}
                    {loading ? 'Checking...' : 'Refresh'}
                </button>
            </div>

            {/* Overall status banner */}
            {health && (
                <div
                    className={clsx(
                        'rounded-xl p-4 border-2 flex items-center gap-4 animate-fade-in',
                        overallOk
                            ? 'bg-emerald-900/20 border-emerald-700/50'
                            : 'bg-yellow-900/20 border-yellow-700/50'
                    )}
                >
                    <div className={clsx('text-3xl', overallOk ? '' : 'animate-pulse')}>
                        {overallOk ? '✅' : '⚠️'}
                    </div>
                    <div className="flex-1">
                        <p className={clsx('font-bold text-lg', overallOk ? 'text-emerald-300' : 'text-yellow-300')}>
                            System is {overallOk ? 'Fully Operational' : 'Degraded'}
                        </p>
                        {lastChecked && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                Last checked at {lastChecked.toLocaleTimeString()} · Response: {health.responseTimeMs}ms
                            </p>
                        )}
                    </div>
                    {health.timestamp && (
                        <p className="text-xs text-gray-600 hidden sm:block">
                            {new Date(health.timestamp).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400">
                    <span className="text-xl mt-0.5">⚠</span>
                    <div>
                        <p className="font-medium">Backend Unreachable</p>
                        <p className="text-sm mt-0.5 text-red-400/80">{error}</p>
                    </div>
                </div>
            )}

            {/* Service cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ServiceCard
                    name="Backend Server"
                    result={services.backend}
                    icon="🖥️"
                />
                <ServiceCard
                    name="MongoDB"
                    result={services.mongodb}
                    icon="🗄️"
                />
                <ServiceCard
                    name="Gemini LLM"
                    result={services.llm}
                    icon="🤖"
                />
            </div>

            {/* System info */}
            {health && (
                <div className="card">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">System Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Backend', value: services.backend?.status === 'ok' ? 'Express 4' : '–' },
                            { label: 'Database', value: 'MongoDB' },
                            { label: 'LLM Model', value: 'Gemini 2.5 Flash' },
                            { label: 'API Type', value: 'OpenAI-compatible' },
                        ].map((item) => (
                            <div key={item.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
                                <p className="text-xs text-gray-500">{item.label}</p>
                                <p className="text-sm text-white font-medium mt-1">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
