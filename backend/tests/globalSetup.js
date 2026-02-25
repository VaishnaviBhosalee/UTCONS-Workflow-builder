const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

module.exports = async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();
    process.env.JWT_SECRET = 'test-secret-for-jest-only';
    process.env.NODE_ENV = 'test';
    // Store reference so globalTeardown can stop it
    global.__MONGOD__ = mongod;
};
