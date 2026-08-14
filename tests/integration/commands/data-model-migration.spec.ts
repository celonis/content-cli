import Module = require("../../../src/commands/data-model-migration/module");
import { DataModelMigrationCommandService } from "../../../src/commands/data-model-migration/data-model-migration-command.service";
import { runCli } from "../../utls/cli-runner";

jest.mock("../../../src/commands/data-model-migration/data-model-migration-command.service");

describe("data-model-migration command integration", () => {
    let mockCommandService: jest.Mocked<DataModelMigrationCommandService>;

    beforeEach(() => {
        mockCommandService = {
            exportDataModel: jest.fn().mockResolvedValue(undefined),
            pushSemanticModel: jest.fn().mockResolvedValue(undefined),
        } as any;
        (DataModelMigrationCommandService as jest.Mock).mockImplementation(() => mockCommandService);
    });

    it("Should wire export data-model to the command service", async () => {
        // Act
        await runCli(["export", "data-model", "--poolId", "pool-1", "--dataModelId", "dm-1"], [Module]);

        // Assert
        expect(mockCommandService.exportDataModel).toHaveBeenCalledWith("pool-1", "dm-1", false);
    });

    it("Should wire push semantic-model to the command service", async () => {
        // Act
        await runCli([
            "push",
            "semantic-model",
            "--poolId",
            "pool-1",
            "--dataModelId",
            "dm-1",
            "--package",
            "pkg-1",
            "--dryRun",
        ], [Module]);

        // Assert
        expect(mockCommandService.pushSemanticModel).toHaveBeenCalledWith({
            poolId: "pool-1",
            dataModelId: "dm-1",
            packageKey: "pkg-1",
            schema: undefined,
            namespace: undefined,
            fromFile: undefined,
            dryRun: true,
            outputToJsonFile: false,
        });
    });
});
