import {
    mockAxiosPost,
    mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { PackageValidationService } from "../../../src/commands/configuration-management/package-validation.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { SchemaValidationResponse } from "../../../src/commands/configuration-management/interfaces/package-validation.interfaces";

describe("Config validate", () => {

    const VALIDATE_URL = "https://myTeam.celonis.cloud/pacman/api/core/packages/my-package/validate";

    it("Should call validate API with correct body", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: true,
            summary: { errors: 0, warnings: 0, info: 0 },
            results: []
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], null, false);

        expect(mockedPostRequestBodyByUrl.get(VALIDATE_URL)).toEqual(JSON.stringify({ layers: ["SCHEMA"] }));
    })

    it("Should include nodeKeys in request body when specified", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: true,
            summary: { errors: 0, warnings: 0, info: 0 },
            results: []
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], ["node-1", "node-2"], false);

        expect(mockedPostRequestBodyByUrl.get(VALIDATE_URL)).toEqual(
            JSON.stringify({ layers: ["SCHEMA"], nodeKeys: ["node-1", "node-2"] })
        );
    })

    it("Should log human-readable output when json flag is not set", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: false,
            summary: { errors: 1, warnings: 0, info: 0 },
            results: [{
                layer: "SCHEMA",
                severity: "ERROR",
                nodeKey: "node-1",
                assetType: "ANALYSIS",
                path: "$.requiredField",
                code: "REQUIRED_PROPERTY_MISSING",
                message: "$.requiredField: is missing but it is required"
            }]
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], null, false);

        const allMessages = loggingTestTransport.logMessages.map(m => m.message).join("\n");
        expect(allMessages).toContain("Validation result: INVALID");
        expect(allMessages).toContain("Errors: 1");
        expect(allMessages).toContain("REQUIRED_PROPERTY_MISSING");
    })

    it("Should write JSON file when json flag is set", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: true,
            summary: { errors: 0, warnings: 0, info: 0 },
            results: []
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], null, true);

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            expect.stringMatching(/config_validate_report_.+\.json$/),
            JSON.stringify(response),
            { encoding: "utf-8" }
        );
    })

    it("Should log VALID when package has no errors", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: true,
            summary: { errors: 0, warnings: 0, info: 0 },
            results: []
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["SCHEMA"], null, false);

        const allMessages = loggingTestTransport.logMessages.map(m => m.message).join("\n");
        expect(allMessages).toContain("Validation result: VALID");
        expect(allMessages).toContain("Errors: 0");
    })
})
