const request = require('supertest');
const mongoose = require('mongoose');

// Must mock BEFORE requiring the app so the module cache uses the mock
jest.mock('../src/services/llm', () => ({
    callLLM: jest.fn(async () => 'mocked'),
    sleep: jest.fn(async () => { }),
    checkLLMHealth: jest.fn(async () => ({ reachable: true, latencyMs: 42 })),
}));

const app = require('../src/index');

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

describe('GET /api/health', () => {
    it('returns correct response shape', async () => {
        const res = await request(app).get('/api/health');
        expect([200, 503]).toContain(res.status);
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body.services).toHaveProperty('backend');
        expect(res.body.services).toHaveProperty('mongodb');
        expect(res.body.services).toHaveProperty('llm');
        expect(res.body).toHaveProperty('responseTimeMs');
    });

    it('reports backend as ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body.services.backend.status).toBe('ok');
    });

    it('reports mongodb as ok (in-memory server)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body.services.mongodb.status).toBe('ok');
    });

    it('reports llm as ok (mocked)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.body.services.llm.status).toBe('ok');
        expect(res.body.services.llm.latencyMs).toBe(42);
    });

    it('does not require authentication', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).not.toBe(401);
    });
});
