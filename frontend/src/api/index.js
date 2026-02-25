import axios from 'axios'

// Use Vite proxy in dev, direct URL in prod
const api = axios.create({
    baseURL: '/api',
    timeout: 120000, // 2 min timeout for LLM requests
    headers: {
        'Content-Type': 'application/json',
    },
})

// ── Workflows ──────────────────────────────────────────────

export const getWorkflows = () => api.get('/workflows').then((r) => r.data)

export const createWorkflow = (data) => api.post('/workflows', data).then((r) => r.data)

export const deleteWorkflow = (id) => api.delete(`/workflows/${id}`).then((r) => r.data)

export const getWorkflow = (id) => api.get(`/workflows/${id}`).then((r) => r.data)

// ── Runs ───────────────────────────────────────────────────

export const executeRun = (data) => api.post('/runs', data).then((r) => r.data)

export const getRuns = () => api.get('/runs').then((r) => r.data)

// ── Health ─────────────────────────────────────────────────

export const getHealth = () => api.get('/health').then((r) => r.data)

export default api
