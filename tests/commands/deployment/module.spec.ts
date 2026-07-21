import Module = require("../../../src/commands/deployment/module");
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

describe("Deployment Module", () => {
    describe("register", () => {
        it("registers the deployment command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            expect(mockConfigurator.command).toHaveBeenCalledWith("deployment");
            expect(mockConfigurator.command).toHaveBeenCalledWith("create");
            expect(mockConfigurator.command).toHaveBeenCalledWith("list");
            expect(mockConfigurator.command).toHaveBeenCalledWith("history");
            expect(mockConfigurator.command).toHaveBeenCalledWith("active");
            expect(mockConfigurator.command).toHaveBeenCalledWith("deployables");
            expect(mockConfigurator.command).toHaveBeenCalledWith("targets");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // create, history, active, deployables, targets
            const expectedLeafCommands = 5;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
        });
    });
});
