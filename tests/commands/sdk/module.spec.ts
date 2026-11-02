import Module = require("../../../src/commands/sdk/module");
import { Command } from "commander";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";
import { PreviewProxy } from "../../../src/commands/sdk/preview-proxy";
import { SdkPreviewService } from "../../../src/commands/sdk/sdk-preview.service";
import { SdkService } from "../../../src/commands/sdk/sdk.service";

describe("SDK Module", () => {
    describe("register", () => {
        it("registers the sdk commands as beta", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("sdk");
            expect(mockConfigurator.beta).toHaveBeenCalledTimes(4);
        });

        it("registers the sdk publish command", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("publish");
            expect(mockConfigurator.requiredOption).toHaveBeenCalledWith("--appId <appId>", expect.any(String));
            expect(mockConfigurator.requiredOption).toHaveBeenCalledWith("--dist <dist>", expect.any(String));
        });

        it("publishes the given dist directory when the publish command runs", async () => {
            const publishApp = jest.spyOn(SdkService.prototype, "publishApp").mockResolvedValue();
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);

            const publishAction = mockConfigurator.action.mock.calls[0][0];
            await publishAction(testContext, new Command(), { appId: "app-id", dist: "dist" });

            expect(publishApp).toHaveBeenCalledWith("app-id", "dist");
        });

        it("registers the sdk preview command with its defaults and without profile loading", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("preview");
            expect(mockConfigurator.option).toHaveBeenCalledWith("--target <target>", expect.any(String), "http://localhost:4200");
            expect(mockConfigurator.option).toHaveBeenCalledWith("--port <port>", expect.any(String), "4300");
            expect(mockConfigurator.option).toHaveBeenCalledWith("--allow-inline-scripts", expect.any(String));
            expect(mockConfigurator.skipProfileLoading).toHaveBeenCalledTimes(1);
        });

        it("starts the preview with the given target and port and closes it on SIGINT", async () => {
            const close = jest.fn().mockResolvedValue(undefined);
            const proxy: PreviewProxy = { url: "https://localhost:4300", close };
            const preview = jest.spyOn(SdkPreviewService.prototype, "preview").mockResolvedValue(proxy);
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);
            const sigintListeners = process.listenerCount("SIGINT");
            const sigtermListeners = process.listenerCount("SIGTERM");

            const previewAction = mockConfigurator.action.mock.calls[1][0];
            const running = previewAction(testContext, new Command(), { target: "http://localhost:5173", port: "5173", allowInlineScripts: true });
            await new Promise(resolve => setImmediate(resolve));
            expect(close).not.toHaveBeenCalled();
            process.emit("SIGINT");
            await running;

            expect(preview).toHaveBeenCalledWith("http://localhost:5173", "5173", true);
            expect(close).toHaveBeenCalledTimes(1);
            expect(process.listenerCount("SIGINT")).toBe(sigintListeners);
            expect(process.listenerCount("SIGTERM")).toBe(sigtermListeners);
        });

        it("registers the sdk token command", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            expect(mockConfigurator.command).toHaveBeenCalledWith("token");
        });

        it("prints the token when the token command runs", async () => {
            const printToken = jest.spyOn(SdkService.prototype, "printToken").mockResolvedValue();
            const mockConfigurator = createMockConfigurator();
            new Module().register(testContext, mockConfigurator);

            const tokenAction = mockConfigurator.action.mock.calls[2][0];
            await tokenAction(testContext, new Command(), {});

            expect(printToken).toHaveBeenCalled();
        });
    });
});
