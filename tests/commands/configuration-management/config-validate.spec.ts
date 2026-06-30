import {
    mockAxiosPost,
    mockedPostRequestBodyByUrl,
} from "../../utls/http-requests-mock";
import { PackageValidationService } from "../../../src/commands/configuration-management/package-validation.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { SchemaValidationResponse } from "../../../src/commands/configuration-management/interfaces/package-validation.interfaces";
import { getJsonFromFile } from "../../utls/fs-utils";

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

        const expectedFileName = loggingTestTransport.logMessages[0].message.split("Validation report file: ")[1];
        expect(getJsonFromFile(expectedFileName)).toEqual(response);
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

    it("Should send PIG_SEMANTICS and DATA_PIPELINES layers in request body when combined with other layers", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: true,
            summary: { errors: 0, warnings: 0, info: 0 },
            results: []
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage(
            "my-package",
            ["SCHEMA", "BUSINESS", "PACKAGE_SETTINGS", "PIG_SEMANTICS", "DATA_PIPELINES"],
            null,
            false
        );

        expect(mockedPostRequestBodyByUrl.get(VALIDATE_URL)).toEqual(
            JSON.stringify({ layers: ["SCHEMA", "BUSINESS", "PACKAGE_SETTINGS", "PIG_SEMANTICS", "DATA_PIPELINES"] })
        );
    })

    it("Should render PIG_SEMANTICS findings in human-readable output", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: false,
            summary: { errors: 0, warnings: 1, info: 0 },
            results: [{
                layer: "PIG_SEMANTICS",
                severity: "WARNING",
                nodeKey: "my-knowledge-model",
                assetType: "SEMANTIC_MODEL",
                path: "$.dataModel",
                code: "DATA_MODEL_NOT_FOUND",
                message: "Referenced data model is not available in the target team"
            }]
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["PIG_SEMANTICS"], null, false);

        const allMessages = loggingTestTransport.logMessages.map(m => m.message).join("\n");
        expect(allMessages).toContain("Validation result: INVALID");
        expect(allMessages).toContain("Warnings: 1");
        expect(allMessages).toContain("my-knowledge-model (SEMANTIC_MODEL)");
        expect(allMessages).toContain("DATA_MODEL_NOT_FOUND");
    })

    it("Should write DATA_PIPELINES findings to the JSON report when json flag is set", async () => {
        const response: SchemaValidationResponse = {
            packageKey: "my-package",
            valid: false,
            summary: { errors: 1, warnings: 0, info: 0 },
            results: [{
                layer: "DATA_PIPELINES",
                severity: "ERROR",
                nodeKey: "my-data-pool",
                assetType: "DATA_POOL",
                path: "$.connection",
                code: "CONNECTION_NOT_FOUND",
                message: "Referenced connection is not available in the target team"
            }]
        };

        mockAxiosPost(VALIDATE_URL, response);

        await new PackageValidationService(testContext).validatePackage("my-package", ["DATA_PIPELINES"], null, true);

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            expect.stringMatching(/config_validate_report_.+\.json$/),
            JSON.stringify(response),
            { encoding: "utf-8", mode: 0o600 }
        );
    })
})
