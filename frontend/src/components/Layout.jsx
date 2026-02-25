import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '../context/AuthContext'

const navItems = [
    { to: '/', label: 'Builder', icon: '⚡' },
    { to: '/run', label: 'Run', icon: '▶' },
    { to: '/history', label: 'History', icon: '◷' },
    { to: '/health', label: 'Health', icon: '❤' },
]

export default function Layout({ children }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/auth')
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 gap-4">
                        {/* Logo */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                W
                            </div>
                            <span className="font-bold text-lg text-white hidden sm:block">
                                Workflow <span className="text-brand-400">Builder</span>
                            </span>
                        </div>

                        {/* Nav */}
                        <nav className="flex items-center gap-1 flex-1 justify-center sm:justify-start">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    className={({ isActive }) =>
                                        clsx(
                                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                            isActive
                                                ? 'bg-brand-900/50 text-brand-300 border border-brand-700/50'
                                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                                        )
                                    }
                                >
                                    <span className="text-base">{item.icon}</span>
                                    <span className="hidden sm:block">{item.label}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* User info + logout */}
                        {user && (
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-brand-700/60 border border-brand-600/50 flex items-center justify-center text-brand-300 text-xs font-bold">
                                        {user.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm text-gray-300 max-w-[120px] truncate">{user.name}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-800"
                                    title="Sign out"
                                >
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
                Workflow Builder · Powered by Gemini 2.5 Flash
            </footer>
        </div>
    )
}
