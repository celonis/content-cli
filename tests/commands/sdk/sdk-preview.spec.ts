import * as net from "node:net";
import { PreviewProxy } from "../../../src/commands/sdk/preview-proxy";
import { SdkPreviewService } from "../../../src/commands/sdk/sdk-preview.service";
import { loggingTestTransport } from "../../jest.setup";
import { makeTempDir, rmTempDir } from "../../utls/fs-utils";

describe("SDK preview", () => {
    let dir: string;
    let port: number;
    let proxy: PreviewProxy | undefined;

    function freePort(): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.once("error", reject);
            server.listen(0, "localhost", () => {
                const { port: freed } = server.address() as net.AddressInfo;
                server.close(() => resolve(freed));
            });
        });
    }

    beforeEach(async () => {
        dir = makeTempDir();
        port = await freePort();
        proxy = undefined;
    });

    afterEach(async () => {
        await proxy?.close();
        rmTempDir(dir);
    });

    it("Should print the preview URL, the target and how to trust the certificate", async () => {
        proxy = await new SdkPreviewService(dir).preview("http://localhost:4200", port);

        const output = loggingTestTransport.logMessages.map(m => m.message).join("\n");
        expect(proxy.url).toContain(`${port}`);
        expect(output).toContain(`Local preview running on https://localhost:${port}, forwarding to http://localhost:4200.`);
        expect(output).toContain(`open https://localhost:${port} in a browser tab`);
        expect(output).toContain("Press Ctrl+C to stop.");
    });

    it("Should accept a string port and a trailing-slash target", async () => {
        proxy = await new SdkPreviewService(dir).preview("http://localhost:4200/", String(port));

        const output = loggingTestTransport.logMessages.map(m => m.message).join("\n");
        expect(output).toContain(`https://localhost:${port}`);
    });

    it.each(["localhost:4200", "ftp://localhost:4200", "http://localhost:4200/app", "http://user:pw@localhost:4200", "http://localhost:4200/?a=1", "http://localhost:4200/#x", "not a url"])(
        "Should reject the target %s", async target => {
            await expect(new SdkPreviewService(dir).preview(target, port))
                .rejects.toThrow("--target must be an http or https origin, for example http://localhost:4200");
        });

    it.each(["abc", "0", "65536", "1.5", "", "-1"])("Should reject the port %p", async invalidPort => {
        await expect(new SdkPreviewService(dir).preview("http://localhost:4200", invalidPort))
            .rejects.toThrow("--port must be a number between 1 and 65535");
    });
});
