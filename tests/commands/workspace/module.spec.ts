import { Command } from "commander";
import Module = require("../../../src/commands/workspace/module");
import { WorkspaceService } from "../../../src/commands/workspace/workspace.service";
import { Configurator } from "../../../src/core/command/module-handler";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

describe("Workspace module", () => {
    it("registers a separate beta command family", () => {
        const configurator = createMockConfigurator();

        new Module().register(testContext, configurator);

        expect(configurator.command).toHaveBeenCalledWith("workspace");
        expect(configurator.command).toHaveBeenCalledWith("clone <packageKey> [directory]");
        expect(configurator.command).toHaveBeenCalledWith("pull [directory]");
        expect(configurator.command).toHaveBeenCalledWith("status [directory]");
        expect(configurator.command).toHaveBeenCalledWith("push [directory]");
        expect(configurator.command).toHaveBeenCalledWith("move <source> <target>");
        expect(configurator.beta).toHaveBeenCalledTimes(6);
        expect(configurator.action).toHaveBeenCalledTimes(5);
    });

    it("dispatches workspace command arguments and options", async () => {
        const clone = jest.spyOn(WorkspaceService.prototype, "clone").mockResolvedValue();
        const pull = jest.spyOn(WorkspaceService.prototype, "pull").mockResolvedValue();
        const status = jest.spyOn(WorkspaceService.prototype, "status").mockReturnValue([]);
        const push = jest.spyOn(WorkspaceService.prototype, "push").mockResolvedValue();
        const move = jest.spyOn(WorkspaceService.prototype, "move").mockReturnValue();

        const execute = async (...args: string[]): Promise<void> => {
            const program = new Command();
            new Module().register(testContext, new Configurator(program, testContext));
            await program.parseAsync(["node", "content-cli", ...args]);
        };

        await execute("workspace", "clone", "package-key", "target");
        await execute("workspace", "pull", "target");
        await execute("workspace", "status", "target");
        await execute("workspace", "push", "target", "--overwrite");
        await execute("workspace", "move", "old.md", "new.md", "--record");

        expect(clone).toHaveBeenCalledWith("package-key", "target");
        expect(pull).toHaveBeenCalledWith("target");
        expect(status).toHaveBeenCalledWith("target");
        expect(push).toHaveBeenCalledWith("target", true);
        expect(move).toHaveBeenCalledWith("old.md", "new.md", true);
    });
});
