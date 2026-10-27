import * as os from "node:os";
import * as path from "node:path";
import { FatalError, logger } from "../../core/utils/logger";
import { loadOrCreatePreviewCertificate } from "./preview-certificate";
import { LOCAL_PREVIEW_HEADERS } from "./preview-headers";
import { PreviewProxy, startPreviewProxy } from "./preview-proxy";

export class SdkPreviewService {
    public static readonly CERTIFICATE_DIRECTORY = path.resolve(os.homedir(), ".celonis-content-cli-preview");

    constructor(private readonly certificateDirectory: string = SdkPreviewService.CERTIFICATE_DIRECTORY) {}

    public async preview(target: string, port: string | number, allowInlineScripts: boolean = false): Promise<PreviewProxy> {
        const targetUrl = this.parseTarget(target);
        const portNumber = this.parsePort(port);

        const certificate = await loadOrCreatePreviewCertificate(this.certificateDirectory);
        const proxy = await startPreviewProxy({
            target: targetUrl,
            port: portNumber,
            certificate,
            headers: LOCAL_PREVIEW_HEADERS,
            allowInlineScripts,
        });

        logger.info(`Local preview running on https://localhost:${portNumber}, forwarding to ${target}.`);
        logger.info(
            `Open the Local preview in your Codespace. If it stays blank, open https://localhost:${portNumber} in a browser tab and accept the certificate, then reload the preview.`
        );
        logger.info("Press Ctrl+C to stop.");
        return proxy;
    }

    private parseTarget(target: string): URL {
        const message = "--target must be an http or https origin, for example http://localhost:4200";
        let url: URL;
        try {
            url = new URL(target);
        } catch {
            throw new FatalError(message);
        }
        const isOrigin =
            (url.protocol === "http:" || url.protocol === "https:") &&
            !url.username &&
            !url.password &&
            url.pathname === "/" &&
            !url.search &&
            !url.hash;
        if (!isOrigin) {
            throw new FatalError(message);
        }
        return url;
    }

    private parsePort(port: string | number): number {
        const value = typeof port === "number" ? port : /^\d+$/.test(port) ? Number(port) : NaN;
        if (!Number.isInteger(value) || value < 1 || value > 65535) {
            throw new FatalError("--port must be a number between 1 and 65535");
        }
        return value;
    }
}
