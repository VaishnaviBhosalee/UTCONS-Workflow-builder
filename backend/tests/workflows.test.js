const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');

let token;
let token2;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    token = null;
    token2 = null;
});

/** Helper: register + return token */
const registerUser = async (email = 'user@example.com', name = 'User') => {
    const res = await request(app).post('/api/auth/register').send({
        name, email, password: 'password123',
    });
    return res.body.token;
};

describe('POST /api/workflows', () => {
    beforeEach(async () => { token = await registerUser(); });

    it('creates a valid workflow', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'My Pipeline', steps: ['clean', 'summarize'] });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('My Pipeline');
        expect(res.body.steps).toHaveLength(2);
        expect(res.body.userId).toBeDefined();
    });

    it('rejects missing name', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ steps: ['clean', 'summarize'] });
        expect(res.status).toBe(400);
    });

    it('rejects only 1 step', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Bad', steps: ['clean'] });
        expect(res.status).toBe(400);
    });

    it('rejects 5 steps', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Too many', steps: ['clean', 'summarize', 'keypoints', 'tag', 'clean'] });
        expect(res.status).toBe(400);
    });

    it('rejects duplicate steps', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Dupes', steps: ['clean', 'clean'] });
        expect(res.status).toBe(400);
    });

    it('rejects an invalid step key', async () => {
        const res = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Bad step', steps: ['clean', 'haxorize'] });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/workflows — user isolation', () => {
    it('only returns workflows owned by the authenticated user', async () => {
        token = await registerUser('user1@example.com', 'User1');
        token2 = await registerUser('user2@example.com', 'User2');

        // User1 creates a workflow
        await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'User1 Pipeline', steps: ['clean', 'summarize'] });

        // User2 should see an empty list
        const res = await request(app)
            .get('/api/workflows')
            .set('Authorization', `Bearer ${token2}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(0);
    });
});

describe('DELETE /api/workflows/:id', () => {
    it('deletes own workflow', async () => {
        token = await registerUser();
        const create = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'To Delete', steps: ['clean', 'summarize'] });

        const del = await request(app)
            .delete(`/api/workflows/${create.body._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(del.status).toBe(200);
    });

    it('cannot delete another user\'s workflow', async () => {
        token = await registerUser('user1@example.com', 'User1');
        token2 = await registerUser('user2@example.com', 'User2');

        const create = await request(app)
            .post('/api/workflows')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'User1 Wf', steps: ['clean', 'summarize'] });

        const del = await request(app)
            .delete(`/api/workflows/${create.body._id}`)
            .set('Authorization', `Bearer ${token2}`);

        expect(del.status).toBe(404);
    });

    it('rejects invalid MongoDB ID', async () => {
        token = await registerUser();
        const res = await request(app)
            .delete('/api/workflows/not-a-valid-id')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(400);
    });
});
