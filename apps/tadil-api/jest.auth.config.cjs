const path = require('path');

module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  testEnvironment: 'node',
  testMatch: ['<rootDir>/apps/tadil-api/src/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        types: ['jest', 'node'],
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        target: 'ES2022',
        module: 'commonjs',
        strict: true,
        skipLibCheck: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@tadil-database$': '<rootDir>/libs/infra/tadil-database/src/dbClient.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};
