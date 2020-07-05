module.exports = {
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 10000,
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
