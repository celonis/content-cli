import type { Config } from "@jest/types"
const config: Config.InitialOptions = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testMatch: ["<rootDir>/tests/**/*.spec.ts"],
    moduleNameMapper: {
        "^\\./../package.json$": "<rootDir>/tests/mocks/package.json",
    },
    setupFilesAfterEnv: [
        // "<rootDir>/tests/jest.setup.ts",
        // Uncomment after setting up tests
    ],
    globals: {
        "ts-jest": {
            tsconfig: {
                sourceMap: true
            }
        }
    }
}

export default config