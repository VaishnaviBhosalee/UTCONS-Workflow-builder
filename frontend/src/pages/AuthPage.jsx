import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'

const inputCls = 'w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200'

function FieldError({ msg }) {
    return msg ? <p className="text-xs text-red-400 mt-1">⚠ {msg}</p> : null
}

export default function AuthPage() {
    const [tab, setTab] = useState('login') // 'login' | 'register'
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [serverError, setServerError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login, register } = useAuth()
    const navigate = useNavigate()

    const set = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }))
        setErrors((prev) => ({ ...prev, [field]: '' }))
        setServerError('')
    }

    const validate = () => {
        const errs = {}
        if (tab === 'register') {
            if (!form.name.trim()) errs.name = 'Name is required'
            else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
        }
        if (!form.email.trim()) errs.email = 'Email is required'
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
        if (!form.password) errs.password = 'Password is required'
        else if (tab === 'register' && form.password.length < 8) errs.password = 'Password must be at least 8 characters'
        return errs
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) return setErrors(errs)

        setLoading(true)
        setServerError('')
        try {
            if (tab === 'login') {
                await login(form.email, form.password)
            } else {
                await register(form.name, form.email, form.password)
            }
            navigate('/')
        } catch (err) {
            const data = err.response?.data
            if (data?.details) {
                // Map server validation errors back to fields
                const byField = {}
                data.details.forEach((d) => { byField[d.field] = d.message })
                setErrors(byField)
            } else {
                const fallbackErr = data?.error || err.message || 'Something went wrong. Please try again.'
                setServerError(typeof fallbackErr === 'string' ? fallbackErr : JSON.stringify(fallbackErr))
            }
        } finally {
            setLoading(false)
        }
    }

    const switchTab = (t) => {
        setTab(t)
        setErrors({})
        setServerError('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-brand-900/50">
                        W
                    </div>
                    <h1 className="text-2xl font-bold text-white">Workflow Builder</h1>
                    <p className="text-gray-400 text-sm mt-1">Design and run AI pipelines</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
                    {/* Tabs */}
                    <div className="flex rounded-lg bg-gray-800 p-1 mb-6">
                        {['login', 'register'].map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => switchTab(t)}
                                className={clsx(
                                    'flex-1 py-2 rounded-md text-sm font-medium transition-all duration-200',
                                    tab === t
                                        ? 'bg-brand-600 text-white shadow-sm'
                                        : 'text-gray-400 hover:text-gray-200'
                                )}
                            >
                                {t === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                        {tab === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    className={clsx(inputCls, errors.name && 'border-red-600 focus:ring-red-500')}
                                    placeholder="Jane Smith"
                                    value={form.name}
                                    onChange={set('name')}
                                    autoComplete="name"
                                />
                                <FieldError msg={errors.name} />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                className={clsx(inputCls, errors.email && 'border-red-600 focus:ring-red-500')}
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={set('email')}
                                autoComplete="email"
                            />
                            <FieldError msg={errors.email} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                            <input
                                type="password"
                                className={clsx(inputCls, errors.password && 'border-red-600 focus:ring-red-500')}
                                placeholder={tab === 'register' ? 'Min. 8 characters, incl. a number' : '••••••••'}
                                value={form.password}
                                onChange={set('password')}
                                autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                            />
                            <FieldError msg={errors.password} />
                        </div>

                        {serverError && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-sm">
                                <span className="mt-0.5">⚠</span> <span>{serverError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center py-3 mt-2"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                                </>
                            ) : (
                                tab === 'login' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-5">
                        {tab === 'login' ? (
                            <>Don't have an account?{' '}
                                <button onClick={() => switchTab('register')} className="text-brand-400 hover:text-brand-300 font-medium">
                                    Create one
                                </button>
                            </>
                        ) : (
                            <>Already have an account?{' '}
                                <button onClick={() => switchTab('login')} className="text-brand-400 hover:text-brand-300 font-medium">
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
