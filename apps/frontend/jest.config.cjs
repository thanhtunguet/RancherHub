/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.test\\.tsx?$',
  transform: {
    '^.+\\.tsx?$': '<rootDir>/src/test/jest.transform.cjs',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // setupFiles runs before the test framework is installed (no jest globals yet)
  setupFiles: ['<rootDir>/src/test/jest.env.ts'],
  // setupFilesAfterEnv runs after jest globals are available
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
