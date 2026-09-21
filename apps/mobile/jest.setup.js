// SafeAreaProvider renders nothing until it has measured insets, which never
// happens without the native module, so tests use the library's own mock.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);
