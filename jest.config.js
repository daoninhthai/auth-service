module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/src/db/migrations/',
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterSetup: [],
};
