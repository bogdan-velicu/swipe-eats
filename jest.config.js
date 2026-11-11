module.exports = {
  preset: 'jest-expo',
  // Emulator-dependent tests live in src/backend/__tests__ and run via `npm run test:emu`.
  testPathIgnorePatterns: ['/node_modules/', '/.superpowers/', '/src/backend/__tests__/'],
};
