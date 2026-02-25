import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(() => localStorage.getItem('wb_token'))
    const [loading, setLoading] = useState(true) // True until we've tried restoring session

    // Restore user from stored token on mount
    useEffect(() => {
        const stored = localStorage.getItem('wb_token')
        const storedUser = localStorage.getItem('wb_user')
        if (stored && storedUser) {
            try {
                setUser(JSON.parse(storedUser))
                setToken(stored)
                api.defaults.headers.common['Authorization'] = `Bearer ${stored}`
            } catch {
                localStorage.removeItem('wb_token')
                localStorage.removeItem('wb_user')
            }
        }
        setLoading(false)
    }, [])

    const saveSession = useCallback((newToken, newUser) => {
        setToken(newToken)
        setUser(newUser)
        localStorage.setItem('wb_token', newToken)
        localStorage.setItem('wb_user', JSON.stringify(newUser))
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    }, [])

    const login = useCallback(async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        saveSession(res.data.token, res.data.user)
        return res.data
    }, [saveSession])

    const register = useCallback(async (name, email, password) => {
        const res = await api.post('/auth/register', { name, email, password })
        saveSession(res.data.token, res.data.user)
        return res.data
    }, [saveSession])

    const logout = useCallback(() => {
        setToken(null)
        setUser(null)
        localStorage.removeItem('wb_token')
        localStorage.removeItem('wb_user')
        delete api.defaults.headers.common['Authorization']
    }, [])

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
