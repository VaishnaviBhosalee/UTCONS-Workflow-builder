// Must mock BEFORE requiring the app so the module cache uses the mock
jest.mock('../src/services/llm', () => ({
    callLLM: jest.fn(async (stepKey, text) => `[mocked ${stepKey} output for: ${text.slice(0, 30)}]`),
    sleep: jest.fn(async () => { }),
    checkLLMHealth: jest.fn(async () => ({ reachable: true, latencyMs: 10 })),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');

let token;
let workflowId;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send({
        name: 'Runner', email: 'runner@example.com', password: 'password123',
    });
    token = reg.body.token;

    const wf = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Pipeline', steps: ['clean', 'summarize'] });
    workflowId = wf.body._id;
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('POST /api/runs', () => {
    it('executes a pipeline and returns step outputs', async () => {
        const res = await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ workflowId, input: 'Hello world, this is a test input.' });

        expect(res.status).toBe(201);
        expect(res.body.stepOutputs).toHaveLength(2);
        expect(res.body.stepOutputs[0].step).toBe('clean');
        expect(res.body.stepOutputs[1].step).toBe('summarize');
    });

    it('saves run to history', async () => {
        await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ workflowId, input: 'Sample input text for testing.' });

        const history = await request(app)
            .get('/api/runs')
            .set('Authorization', `Bearer ${token}`);

        expect(history.status).toBe(200);
        expect(history.body).toHaveLength(1);
        expect(history.body[0].workflowName).toBe('Test Pipeline');
    });

    it('rejects input exceeding 10,000 characters', async () => {
        const longInput = 'a'.repeat(10001);
        const res = await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ workflowId, input: longInput });

        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('input');
    });

    it('rejects missing workflowId', async () => {
        const res = await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ input: 'Some text' });
        expect(res.status).toBe(400);
    });

    it('rejects invalid workflowId format', async () => {
        const res = await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ workflowId: 'not-an-objectid', input: 'Some text' });
        expect(res.status).toBe(400);
    });

    it('returns 404 for another user\'s workflow', async () => {
        const reg2 = await request(app).post('/api/auth/register').send({
            name: 'Thief', email: 'thief@example.com', password: 'password123',
        });
        const token2 = reg2.body.token;

        const res = await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token2}`)
            .send({ workflowId, input: 'Trying to steal...' });

        expect(res.status).toBe(404);
    });
});

describe('GET /api/runs — user isolation', () => {
    it('returns at most 5 runs', async () => {
        for (let i = 0; i < 6; i++) {
            await request(app)
                .post('/api/runs')
                .set('Authorization', `Bearer ${token}`)
                .send({ workflowId, input: `Run number ${i} input text here` });
        }

        const res = await request(app)
            .get('/api/runs')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.length).toBeLessThanOrEqual(5);
    });

    it('does not return other users\' runs', async () => {
        await request(app)
            .post('/api/runs')
            .set('Authorization', `Bearer ${token}`)
            .send({ workflowId, input: 'User1 private text' });

        const reg2 = await request(app).post('/api/auth/register').send({
            name: 'User2', email: 'user2@example.com', password: 'password123',
        });
        const token2 = reg2.body.token;

        const res = await request(app)
            .get('/api/runs')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});
