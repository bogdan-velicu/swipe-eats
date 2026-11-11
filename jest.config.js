module.exports = {
  preset: 'jest-expo',
  // Emulator-dependent tests (npm run test:emu) are excluded here; mock-only backend tests
  // (e.g. placesClient) run under plain jest.
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.superpowers/',
    '/functions/node_modules/',
    '/src/backend/__tests__/(auth|rules|sessionService)\.test',
  ],
};
