// Emulator-backed tests (npm run test:emu). Deliberately NOT the jest-expo preset: its setup
// stubs global fetch, but the Auth SDK must reach the emulator over real HTTP. Plain node env +
// babel-preset-expo (via babel.config.js) is enough for these backend tests.
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/.superpowers/'],
  testMatch: ['<rootDir>/src/backend/__tests__/**/*.test.ts'],
  testTimeout: 20000,
  transformIgnorePatterns: ['/node_modules/(?!expo/virtual/)'],
  // jest resolves the Node build of @firebase/auth; force the React Native build (what the app runs).
  moduleNameMapper: { '^@firebase/auth$': '<rootDir>/node_modules/@firebase/auth/dist/rn/index.js' },
  setupFiles: ['<rootDir>/jest.emu.setup.js'],
};
