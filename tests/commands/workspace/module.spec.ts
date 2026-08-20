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
        expect(configurator.command).toHaveBeenCalledWith("clone <projectKey> [directory]");
        expect(configurator.command).toHaveBeenCalledWith("checkout [branch]");
        expect(configurator.command).toHaveBeenCalledWith("pull [paths...]");
        expect(configurator.command).toHaveBeenCalledWith("status [directory]");
        expect(configurator.command).toHaveBeenCalledWith("push [paths...]");
        expect(configurator.command).toHaveBeenCalledWith("move <source> <target>");
        expect(configurator.beta).toHaveBeenCalledTimes(7);
        expect(configurator.action).toHaveBeenCalledTimes(6);
    });

    it("dispatches workspace command arguments and options", async () => {
        const clone = jest.spyOn(WorkspaceService.prototype, "clone").mockResolvedValue();
        const checkout = jest.spyOn(WorkspaceService.prototype, "checkout").mockResolvedValue();
        const pull = jest.spyOn(WorkspaceService.prototype, "pull").mockResolvedValue();
        const status = jest.spyOn(WorkspaceService.prototype, "statusWithGit").mockResolvedValue([]);
        const push = jest.spyOn(WorkspaceService.prototype, "push").mockResolvedValue();
        const move = jest.spyOn(WorkspaceService.prototype, "move").mockReturnValue();

        const execute = async (...args: string[]): Promise<void> => {
            const program = new Command();
            new Module().register(testContext, new Configurator(program, testContext));
            await program.parseAsync(["node", "content-cli", ...args]);
        };

        await execute("workspace", "clone", "package-key", "target", "--branch", "feature-a");
        await execute("workspace", "checkout", "feature-a", "--link-git");
        await execute("workspace", "checkout", "-b", "feature-b");
        await execute("workspace", "pull", "target", "other.md");
        await execute("workspace", "pull", "--full");
        await execute("workspace", "status", "target");
        await execute("workspace", "push", "target", "other.md");
        await execute("workspace", "move", "old.md", "new.md", "--record");

        expect(clone).toHaveBeenCalledWith("package-key", "target", { branch: "feature-a" });
        expect(checkout).toHaveBeenNthCalledWith(1, "feature-a", {
            create: false,
            discard: false,
            linkGit: true,
        });
        expect(checkout).toHaveBeenNthCalledWith(2, "feature-b", {
            create: true,
            discard: false,
            linkGit: false,
        });
        expect(pull).toHaveBeenNthCalledWith(1, ["target", "other.md"], { full: false });
        expect(pull).toHaveBeenNthCalledWith(2, [], { full: true });
        expect(status).toHaveBeenCalledWith("target");
        expect(push).toHaveBeenCalledWith(["target", "other.md"], { full: false, overwrite: false });
        expect(move).toHaveBeenCalledWith("old.md", "new.md", true);
    });
});
