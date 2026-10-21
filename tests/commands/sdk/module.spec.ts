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
            expect(mockConfigurator.beta).toHaveBeenCalledTimes(2);
        });

        it("downloads the SDK of the given app when the download command runs", async () => {
            const downloadSdk = jest.spyOn(SdkService.prototype, "downloadSdk").mockResolvedValue();
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);

            const downloadAction = mockConfigurator.action.mock.calls[0][0];
            await downloadAction(testContext, new Command(), { appId: "app-id" });

            expect(downloadSdk).toHaveBeenCalledWith("app-id");
        });
    });
});
