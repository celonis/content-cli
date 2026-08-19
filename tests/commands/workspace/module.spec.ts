import Module = require("../../../src/commands/workspace/module");
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

describe("Workspace module", () => {
    it("registers a separate beta command family", () => {
        const configurator = createMockConfigurator();

        new Module().register(testContext, configurator);

        expect(configurator.command).toHaveBeenCalledWith("workspace");
        expect(configurator.command).toHaveBeenCalledWith("checkout <packageKey> [directory]");
        expect(configurator.command).toHaveBeenCalledWith("status [directory]");
        expect(configurator.command).toHaveBeenCalledWith("push [directory]");
        expect(configurator.command).toHaveBeenCalledWith("move <source> <target>");
        expect(configurator.beta).toHaveBeenCalledTimes(5);
        expect(configurator.action).toHaveBeenCalledTimes(4);
    });
});
