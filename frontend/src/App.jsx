import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import WorkflowBuilder from './pages/WorkflowBuilder'
import RunPage from './pages/RunPage'
import HistoryPage from './pages/HistoryPage'
import HealthDashboard from './pages/HealthDashboard'
import AuthPage from './pages/AuthPage'

/** Redirect to /auth if not logged in */
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="inline-block w-8 h-8 border-2 border-gray-700 border-t-brand-500 rounded-full animate-spin" />
            </div>
        )
    }
    if (!user) return <Navigate to="/auth" replace />
    return children
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<WorkflowBuilder />} />
                                <Route path="/run" element={<RunPage />} />
                                <Route path="/history" element={<HistoryPage />} />
                                <Route path="/health" element={<HealthDashboard />} />
                            </Routes>
                        </Layout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
