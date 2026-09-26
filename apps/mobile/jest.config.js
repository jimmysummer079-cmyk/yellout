const path = require('path');

/** Keep jest resolving Expo packages from the mobile workspace install. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@yellout/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  moduleDirectories: [
    'node_modules',
    path.join(__dirname, 'node_modules'),
    path.join(__dirname, '../../node_modules'),
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@yellout/shared|react-native-svg)',
  ],
};
