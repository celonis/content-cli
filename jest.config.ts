import type {Config} from "@jest/types";
const config: Config.InitialOptions = {
    verbose: true,
    preset: "ts-jest",
    testEnvironment: "node",
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    sourceMap: true,
                },
            },
        ],
    },
    testMatch: ["<rootDir>/tests/**/*.spec.ts"],
    moduleNameMapper: {
        "^\\./../../package.json$": "<rootDir>/tests/mocks/package.json",
    },
    setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
    // Coverage configuration
    collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts", "!src/**/*.spec.ts", "!src/**/index.ts"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    coverageProvider: "v8",
    coveragePathIgnorePatterns: ["/node_modules/", "/tests/", "/coverage/", "jest.setup.ts"],
};

export default config;
