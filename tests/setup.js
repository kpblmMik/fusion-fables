// Global test setup and cleanup

// Increase timeout for integration tests
jest.setTimeout(15000);

// Add delay between tests to allow port cleanup
afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
});

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep error and warn for visibility
        error: console.error,
        warn: console.warn
    };
}

// Global cleanup after all tests
afterAll(async () => {
    // Allow any pending promises to settle
    await new Promise(resolve => setTimeout(resolve, 100));
});
