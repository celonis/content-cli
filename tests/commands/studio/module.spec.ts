import Module = require("../../../src/commands/studio/module");
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

describe("Studio Module", () => {
    describe("register", () => {
        it("registers the studio command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            expect(mockConfigurator.command).toHaveBeenCalledWith("list");
            expect(mockConfigurator.command).toHaveBeenCalledWith("pull");
            expect(mockConfigurator.command).toHaveBeenCalledWith("push");
            expect(mockConfigurator.command).toHaveBeenCalledWith("package");
            expect(mockConfigurator.command).toHaveBeenCalledWith("packages");
            expect(mockConfigurator.command).toHaveBeenCalledWith("widget");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // list (packages/spaces/assets) + pull (asset/package) + push (asset/assets/package/packages/widget)
            const expectedLeafCommands = 10;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
        });

        it("deprecates the package push/pull/list commands, pointing at their config counterparts (never t2tc)", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.deprecationNotice).toHaveBeenCalledTimes(4);
            expect(mockConfigurator.deprecationNotice).toHaveBeenCalledWith(
                "'pull package' is deprecated and will be removed in a future release. Use 'config package export' instead."
            );
            expect(mockConfigurator.deprecationNotice).toHaveBeenCalledWith(
                "'push package' is deprecated and will be removed in a future release. Use 'config package import' instead."
            );
            expect(mockConfigurator.deprecationNotice).toHaveBeenCalledWith(
                "'push packages' is deprecated and will be removed in a future release. Use 'config package import' (single package) instead."
            );
            expect(mockConfigurator.deprecationNotice).toHaveBeenCalledWith(
                "'list packages' is deprecated and will be removed in a future release. Use 'config package list' instead."
            );

            for (const call of mockConfigurator.deprecationNotice.mock.calls) {
                expect(call[0]).not.toMatch(/t2tc/);
            }
        });

        it("prefixes the deprecated commands' descriptions with the recommended replacement", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.description).toHaveBeenCalledWith(
                "[Deprecated] Use 'config package export' instead. Command to pull a package"
            );
            expect(mockConfigurator.description).toHaveBeenCalledWith(
                "[Deprecated] Use 'config package import' instead. Command to push a package to Studio"
            );
            expect(mockConfigurator.description).toHaveBeenCalledWith(
                "[Deprecated] Use 'config package list' instead. Command to list all packages"
            );
            expect(mockConfigurator.description).toHaveBeenCalledWith(
                "[Deprecated] Use 'config package import' (single package) instead. Command to push packages to Studio"
            );
        });
    });
});
