const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/utils/',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/app/**/layout.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage',
  // Coverage thresholds - start low, increase as coverage improves
  // Run `npm run test:coverage` locally to see current coverage
  coverageThreshold: {
    global: {
      statements: 0.5,
      branches: 0,
      functions: 0.5,
      lines: 0.5,
    },
    // Higher thresholds for tested business logic only
    'src/lib/scoring/calculate.ts': {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80,
    },
  },
  // Improve CI performance
  maxWorkers: process.env.CI ? 2 : '50%',
  // Better error output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
