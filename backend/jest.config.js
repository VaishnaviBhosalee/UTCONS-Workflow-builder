/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    globalSetup: './tests/globalSetup.js',
    globalTeardown: './tests/globalTeardown.js',
    testTimeout: 15000,
    verbose: true,
    clearMocks: true,
    resetMocks: false, // Don't reset so jest.mock() works across beforeAll/beforeEach
};
