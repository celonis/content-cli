import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { Duplex } from "node:stream";
import { createProxyMiddleware } from "http-proxy-middleware";
import { FatalError, logger } from "../../core/utils/logger";
import { PreviewCertificate } from "./preview-certificate";
import { allowInlineScripts, inlineScriptHashes } from "./preview-inline-scripts";

export interface PreviewProxyOptions {
    target: URL;
    port: number;
    certificate: PreviewCertificate;
    headers: Readonly<Record<string, string>>;
    /** Adds a hash of each inline script in proxied HTML to `script-src`. Published apps block inline scripts. */
    allowInlineScripts: boolean;
}

export interface PreviewProxy {
    url: string;
    close(): Promise<void>;
}

const REPLACED_HEADERS = ["content-security-policy", "content-security-policy-report-only", "x-frame-options"];
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BODILESS_STATUSES = new Set([204, 304]);

function inlineScriptWarning(path: string, excerpt: string, allowed: boolean): string {
    return allowed
        ? `Allowing an inline script in ${path} for the local preview: "${excerpt}". ` +
            "Published apps block inline scripts, so this only works locally unless your dev server added it " +
            "for local development only."
        : `Blocking an inline script in ${path}: "${excerpt}". Published apps block inline scripts too. ` +
            "If your dev server added it for local development only, pass --allow-inline-scripts.";
}

export function startPreviewProxy(options: PreviewProxyOptions): Promise<PreviewProxy> {
    const { target, port, certificate, headers, allowInlineScripts: allowInline } = options;
    const removedHeaders = new Set([...REPLACED_HEADERS, ...Object.keys(headers).map(name => name.toLowerCase())]);
    const unreachableMessage = `content-cli sdk preview can't reach ${target.origin}. Start your dev server or pass --target.`;
    const openSockets = new Set<Duplex>();
    const warnedInlineScripts = new Set<string>();
    let warnedUnreachable = false;

    function track(socket: Duplex): void {
        openSockets.add(socket);
        socket.once("close", () => openSockets.delete(socket));
    }

    function respondHtml(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse,
        responseHeaders: http.OutgoingHttpHeaders): void {
        const chunks: Buffer[] = [];
        proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on("end", () => {
            if (res.destroyed) {
                return;
            }
            const body = Buffer.concat(chunks);
            const scripts = inlineScriptHashes(body.toString("utf8"));
            for (const { hash, excerpt } of scripts) {
                if (!warnedInlineScripts.has(hash)) {
                    warnedInlineScripts.add(hash);
                    logger.warn(inlineScriptWarning(req.url, excerpt, allowInline));
                }
            }
            if (proxyRes.headers["content-length"] !== undefined) {
                responseHeaders["content-length"] = body.length;
            }
            const csp = headers["content-security-policy"];
            res.writeHead(proxyRes.statusCode, {
                ...responseHeaders,
                ...headers,
                ...(csp === undefined || !allowInline ? {} : {
                    "content-security-policy": allowInlineScripts(csp, scripts.map(script => script.hash)),
                }),
            });
            res.end(body);
        });
    }

    function onProxyRes(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse): void {
        warnedUnreachable = false;
        const responseHeaders: http.OutgoingHttpHeaders = {};
        for (const [name, value] of Object.entries(proxyRes.headers)) {
            if (!removedHeaders.has(name.toLowerCase())) {
                responseHeaders[name] = value;
            }
        }
        proxyRes.on("error", () => res.destroy());
        proxyRes.on("aborted", () => res.destroy());

        const isHtml = /^text\/html\b/i.test(proxyRes.headers["content-type"] ?? "");
        const hasBody = req.method !== "HEAD" && !BODILESS_STATUSES.has(proxyRes.statusCode);
        if (isHtml && hasBody) {
            respondHtml(proxyRes, req, res, responseHeaders);
            return;
        }
        res.writeHead(proxyRes.statusCode, { ...responseHeaders, ...headers });
        proxyRes.pipe(res);
    }

    function onProxyReq(proxyReq: http.ClientRequest, _req: http.IncomingMessage, res: http.ServerResponse): void {
        res.on("close", () => {
            if (!res.writableFinished) {
                proxyReq.destroy();
            }
        });
    }

    function onError(_error: Error, _req: http.IncomingMessage, res: http.ServerResponse | Duplex): void {
        if (!(res instanceof http.ServerResponse)) {
            res.destroy();
            return;
        }
        if (res.destroyed) {
            return;
        }
        if (res.headersSent) {
            res.destroy();
            return;
        }
        if (!warnedUnreachable) {
            warnedUnreachable = true;
            logger.warn(unreachableMessage);
        }
        res.writeHead(502, { ...headers, "content-type": "text/plain" });
        res.end(unreachableMessage);
    }

    const proxy = createProxyMiddleware({
        target: target.origin,
        changeOrigin: true,
        ws: true,
        secure: !LOOPBACK_HOSTNAMES.has(target.hostname),
        selfHandleResponse: true,
        headers: { "accept-encoding": "identity" },
        on: { proxyReq: onProxyReq, proxyRes: onProxyRes, error: onError },
    });

    const server = https.createServer({ key: certificate.key, cert: certificate.cert }, (req, res) =>
        proxy(req, res, () => undefined));
    server.on("connection", track);
    server.on("upgrade", (req, socket, head) => {
        track(socket);
        proxy.upgrade(req, socket as net.Socket, head);
    });

    function close(): Promise<void> {
        return new Promise<void>(closed => {
            server.close(() => closed());
            openSockets.forEach(socket => socket.destroy());
        });
    }

    return new Promise((resolve, reject) => {
        const onListenError = (error: NodeJS.ErrnoException): void => {
            reject(new FatalError(error.code === "EADDRINUSE"
                ? `Port ${port} is already in use. Stop the other process or pass --port.`
                : `Could not start the preview proxy on port ${port}: ${error.message}`));
        };
        server.once("error", onListenError);
        server.listen({ port, host: "localhost" }, () => {
            server.off("error", onListenError);
            resolve({
                url: `https://localhost:${(server.address() as net.AddressInfo).port}`,
                close,
            });
        });
    });
}
