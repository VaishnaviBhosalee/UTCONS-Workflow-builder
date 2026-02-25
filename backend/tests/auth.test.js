const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/index');

// Helper to create a fresh DB connection per suite
beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

afterEach(async () => {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('POST /api/auth/register', () => {
    it('registers a new user and returns a token', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Alice',
            email: 'alice@example.com',
            password: 'password123',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe('alice@example.com');
        expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('rejects duplicate email with 409', async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Alice', email: 'alice@example.com', password: 'password123',
        });
        const res = await request(app).post('/api/auth/register').send({
            name: 'Alice2', email: 'alice@example.com', password: 'password456',
        });
        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error');
    });

    it('rejects invalid email format', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Bob', email: 'not-an-email', password: 'password123',
        });
        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('email');
    });

    it('rejects weak password (too short)', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Bob', email: 'bob@example.com', password: 'abc',
        });
        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('password');
    });

    it('rejects password without letters and numbers', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Bob', email: 'bob@example.com', password: 'onlyletters',
        });
        expect(res.status).toBe(400);
    });

    it('rejects missing name', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'bob@example.com', password: 'password123',
        });
        expect(res.status).toBe(400);
        expect(res.body.details[0].field).toBe('name');
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Alice', email: 'alice@example.com', password: 'password123',
        });
    });

    it('logs in with correct credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'alice@example.com', password: 'password123',
        });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    it('rejects wrong password with 401', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'alice@example.com', password: 'wrongpassword1',
        });
        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('rejects unknown email with 401 (no user enumeration)', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'nobody@example.com', password: 'password123',
        });
        expect(res.status).toBe(401);
        // Same error message — doesn't reveal whether email exists
        expect(res.body.error).toMatch(/invalid/i);
    });

    it('rejects missing password field', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'alice@example.com',
        });
        expect(res.status).toBe(400);
    });
});

describe('Protected route — no token', () => {
    it('returns 401 when no Authorization header', async () => {
        const res = await request(app).get('/api/workflows');
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('returns 401 when token is malformed', async () => {
        const res = await request(app)
            .get('/api/workflows')
            .set('Authorization', 'Bearer not.a.valid.token');
        expect(res.status).toBe(401);
    });
});
