export default {
    // Use ES modules
    transform: {},

    // Test file patterns
    testMatch: [
        "**/tests/**/*.test.js"
    ],

    // Module file extensions
    moduleFileExtensions: ["js", "mjs", "json"],

    // Coverage configuration
    collectCoverageFrom: [
        "src/**/*.js",
        "public/**/*.js",
        "!**/node_modules/**"
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            statements: 50,
            branches: 50,
            functions: 50,
            lines: 50
        }
    },

    // Coverage reporters
    coverageReporters: ["text", "lcov", "html"],

    // Coverage output directory
    coverageDirectory: "coverage",

    // Setup files
    setupFilesAfterEnv: ["./tests/setup.js"],

    // Test environment
    testEnvironment: "node",

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles
    detectOpenHandles: true,

    // Test timeout
    testTimeout: 15000,

    // Run tests serially to avoid port conflicts
    maxWorkers: 1,

    // Projects for different test environments
    projects: [
        {
            displayName: "server",
            testMatch: [
                "**/tests/unit/server/**/*.test.js",
                "**/tests/integration/**/*.test.js"
            ],
            testEnvironment: "node"
        },
        {
            displayName: "client",
            testMatch: [
                "**/tests/unit/client/**/*.test.js"
            ],
            testEnvironment: "jsdom"
        }
    ]
};
