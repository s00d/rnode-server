import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_PORT = '0'; // Use random port for tests
  
  console.log('🧪 Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Test environment cleanup complete');
});

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.VITEST_VERBOSE !== 'true') {
    console.log = () => {};
    console.error = () => {};
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});
