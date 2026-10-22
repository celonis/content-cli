import Module = require("../../../src/commands/sdk/module");
import { Command } from "commander";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";
import { SdkService } from "../../../src/commands/sdk/sdk.service";

describe("SDK Module", () => {
    describe("register", () => {
        it("registers the sdk download command as beta", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("sdk");
            expect(mockConfigurator.command).toHaveBeenCalledWith("download");
            expect(mockConfigurator.requiredOption).toHaveBeenCalledWith("--appId <appId>", expect.any(String));
            expect(mockConfigurator.beta).toHaveBeenCalledTimes(3);
        });

        it("registers the sdk publish command", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("publish");
            expect(mockConfigurator.requiredOption).toHaveBeenCalledWith("--dist <dist>", expect.any(String));
        });

        it("downloads the SDK of the given app when the download command runs", async () => {
            const downloadSdk = jest.spyOn(SdkService.prototype, "downloadSdk").mockResolvedValue();
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);

            const downloadAction = mockConfigurator.action.mock.calls[0][0];
            await downloadAction(testContext, new Command(), { appId: "app-id" });

            expect(downloadSdk).toHaveBeenCalledWith("app-id");
        });

        it("publishes the given dist directory when the publish command runs", async () => {
            const publishApp = jest.spyOn(SdkService.prototype, "publishApp").mockResolvedValue();
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);

            const publishAction = mockConfigurator.action.mock.calls[1][0];
            await publishAction(testContext, new Command(), { appId: "app-id", dist: "dist" });

            expect(publishApp).toHaveBeenCalledWith("app-id", "dist");
        });
    });
});
