import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { Duplex } from "node:stream";
import * as tls from "node:tls";
import { FatalError, logger } from "../../core/utils/logger";
import { PreviewCertificate } from "./preview-certificate";

export interface PreviewProxyOptions {
    target: URL;
    port: number;
    certificate: PreviewCertificate;
    headers: Readonly<Record<string, string>>;
}

export interface PreviewProxy {
    url: string;
    close(): Promise<void>;
}

const REPLACED_HEADERS = ["content-security-policy", "content-security-policy-report-only", "x-frame-options"];
const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

export function startPreviewProxy(options: PreviewProxyOptions): Promise<PreviewProxy> {
    const { target, port, certificate, headers } = options;
    const secureTarget = target.protocol === "https:";
    const targetHostname = target.hostname.replace(/^\[(.*)\]$/, "$1");
    const targetPort = Number(target.port) || (secureTarget ? 443 : 80);
    const rejectUnauthorized = !LOOPBACK_HOSTNAMES.includes(target.hostname);
    const agent = secureTarget
        ? new https.Agent({ keepAlive: true, rejectUnauthorized })
        : new http.Agent({ keepAlive: true });
    const removedHeaders = new Set([...REPLACED_HEADERS, ...Object.keys(headers).map(name => name.toLowerCase())]);
    const unreachableMessage = `content-cli sdk preview can't reach ${target.origin}. Start your dev server or pass --target.`;
    const openSockets = new Set<Duplex>();
    let warnedUnreachable = false;

    function track(socket: Duplex): void {
        openSockets.add(socket);
        socket.once("close", () => openSockets.delete(socket));
    }

    function forwardRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const proxyReq = (secureTarget ? https : http).request({
            protocol: target.protocol,
            hostname: targetHostname,
            port: targetPort,
            method: req.method,
            path: req.url,
            headers: { ...req.headers, host: target.host },
            agent,
        });

        proxyReq.on("response", proxyRes => {
            warnedUnreachable = false;
            const responseHeaders: http.OutgoingHttpHeaders = {};
            for (const [name, value] of Object.entries(proxyRes.headers)) {
                if (!removedHeaders.has(name.toLowerCase())) {
                    responseHeaders[name] = value;
                }
            }
            res.writeHead(proxyRes.statusCode, { ...responseHeaders, ...headers });
            proxyRes.on("error", () => res.destroy());
            proxyRes.on("aborted", () => res.destroy());
            proxyRes.pipe(res);
        });

        proxyReq.on("error", () => {
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
        });

        res.on("close", () => {
            if (!res.writableFinished) {
                proxyReq.destroy();
            }
        });

        req.pipe(proxyReq);
    }

    function forwardUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
        const targetSocket: net.Socket = secureTarget
            ? tls.connect({
                host: targetHostname,
                port: targetPort,
                servername: net.isIP(targetHostname) ? undefined : targetHostname,
                rejectUnauthorized,
            })
            : net.connect({ host: targetHostname, port: targetPort });
        track(targetSocket);

        const destroyBoth = (): void => {
            socket.destroy();
            targetSocket.destroy();
        };
        socket.on("error", destroyBoth);
        targetSocket.on("error", destroyBoth);
        socket.on("close", () => targetSocket.destroy());
        targetSocket.on("close", () => socket.destroy());

        targetSocket.once(secureTarget ? "secureConnect" : "connect", () => {
            const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
            for (let i = 0; i < req.rawHeaders.length; i += 2) {
                const name = req.rawHeaders[i];
                lines.push(`${name}: ${name.toLowerCase() === "host" ? target.host : req.rawHeaders[i + 1]}`);
            }
            targetSocket.write(`${lines.join("\r\n")}\r\n\r\n`);
            if (head.length > 0) {
                targetSocket.write(head);
            }
            targetSocket.pipe(socket);
            socket.pipe(targetSocket);
        });
    }

    const server = https.createServer({ key: certificate.key, cert: certificate.cert }, forwardRequest);
    server.on("connection", track);
    server.on("upgrade", forwardUpgrade);

    return new Promise((resolve, reject) => {
        const onListenError = (error: NodeJS.ErrnoException): void => {
            agent.destroy();
            reject(new FatalError(error.code === "EADDRINUSE"
                ? `Port ${port} is already in use. Stop the other process or pass --port.`
                : `Could not start the preview proxy on port ${port}: ${error.message}`));
        };
        server.once("error", onListenError);
        server.listen({ port, host: "localhost" }, () => {
            server.off("error", onListenError);
            resolve({
                url: `https://localhost:${(server.address() as net.AddressInfo).port}`,
                close: () => new Promise<void>(closed => {
                    server.close(() => closed());
                    openSockets.forEach(socket => socket.destroy());
                    agent.destroy();
                }),
            });
        });
    });
}
