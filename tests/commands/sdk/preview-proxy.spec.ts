import { createHash } from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import { Duplex } from "node:stream";
import { loadOrCreatePreviewCertificate, PreviewCertificate } from "../../../src/commands/sdk/preview-certificate";
import { LOCAL_PREVIEW_HEADERS } from "../../../src/commands/sdk/preview-headers";
import { PreviewProxy, PreviewProxyOptions, startPreviewProxy } from "../../../src/commands/sdk/preview-proxy";
import { loggingTestTransport } from "../../jest.setup";
import { makeTempDir, rmTempDir } from "../../utls/fs-utils";

interface ProxyResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    rawHeaders: string[];
    body: string;
}

describe("Preview proxy", () => {
    let dir: string;
    let certificate: PreviewCertificate;
    let targets: http.Server[];
    let sockets: Duplex[];
    let proxies: PreviewProxy[];
    let blockers: net.Server[];

    beforeEach(async () => {
        dir = makeTempDir();
        certificate = await loadOrCreatePreviewCertificate(dir);
        targets = [];
        sockets = [];
        proxies = [];
        blockers = [];
    });

    afterEach(async () => {
        sockets.forEach(socket => socket.destroy());
        await Promise.all(proxies.map(proxy => proxy.close()));
        await Promise.all(targets.map(target => new Promise<void>(resolve => {
            target.closeAllConnections();
            target.close(() => resolve());
        })));
        await Promise.all(blockers.map(blocker => new Promise<void>(resolve => blocker.close(() => resolve()))));
        rmTempDir(dir);
    });

    function freePort(): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.once("error", reject);
            server.listen(0, "localhost", () => {
                const port = (server.address() as net.AddressInfo).port;
                server.close(() => resolve(port));
            });
        });
    }

    function startTarget(handler: http.RequestListener, port: number = 0): Promise<http.Server> {
        const target = http.createServer(handler);
        targets.push(target);
        return new Promise((resolve, reject) => {
            target.once("error", reject);
            target.listen(port, "localhost", () => resolve(target));
        });
    }

    function targetUrl(target: http.Server): URL {
        return new URL(`http://localhost:${(target.address() as net.AddressInfo).port}`);
    }

    async function startProxy(target: URL, allowInlineScripts: boolean = false): Promise<PreviewProxy> {
        const proxy = await startPreviewProxy({
            target,
            port: await freePort(),
            certificate,
            headers: LOCAL_PREVIEW_HEADERS,
            allowInlineScripts,
        });
        proxies.push(proxy);
        return proxy;
    }

    function send(proxy: PreviewProxy, path: string, method: string = "GET", body?: string): Promise<ProxyResponse> {
        return new Promise((resolve, reject) => {
            const request = https.request(`${proxy.url}${path}`, { method, ca: certificate.cert, agent: false }, response => {
                const chunks: Buffer[] = [];
                response.on("data", chunk => chunks.push(chunk));
                response.on("end", () => resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    rawHeaders: response.rawHeaders,
                    body: Buffer.concat(chunks).toString(),
                }));
                response.on("error", reject);
            });
            request.on("error", reject);
            request.end(body);
        });
    }

    function headerCount(rawHeaders: string[], name: string): number {
        return rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === name).length;
    }

    it("Should forward method, path, query and body to the target and return its status and body", async () => {
        const target = await startTarget((req, res) => {
            const chunks: Buffer[] = [];
            req.on("data", chunk => chunks.push(chunk));
            req.on("end", () => {
                res.writeHead(201);
                res.end(`${req.method} ${req.url} ${Buffer.concat(chunks).toString()}`);
            });
        });
        const proxy = await startProxy(targetUrl(target));

        const response = await send(proxy, "/api/x?y=1", "POST", "hi");

        expect(proxy.url).toMatch(/^https:\/\/localhost:\d+$/);
        expect(response.status).toBe(201);
        expect(response.body).toBe("POST /api/x?y=1 hi");
    });

    it("Should rewrite the host header to the target", async () => {
        const target = await startTarget((req, res) => res.end(req.headers.host));
        const proxy = await startProxy(targetUrl(target));

        const response = await send(proxy, "/");

        expect(response.body).toBe(targetUrl(target).host);
    });

    it("Should replace the target's security headers with the preview headers", async () => {
        const target = await startTarget((req, res) => {
            res.setHeader("Content-Security-Policy", "default-src *");
            res.setHeader("Content-Security-Policy-Report-Only", "default-src *");
            res.setHeader("X-Frame-Options", "DENY");
            res.setHeader("Access-Control-Allow-Origin", "https://evil.example");
            res.setHeader("Cache-Control", "max-age=3600");
            res.setHeader("Content-Type", "text/html");
            res.end("<html></html>");
        });
        const proxy = await startProxy(targetUrl(target));

        const response = await send(proxy, "/");

        expect(response.headers["content-security-policy"]).toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
        expect(response.headers["content-security-policy-report-only"]).toBeUndefined();
        expect(response.headers["x-frame-options"]).toBeUndefined();
        expect(response.headers["access-control-allow-origin"]).toBe("*");
        expect(response.headers["content-type"]).toBe("text/html");
        for (const [name, value] of Object.entries(LOCAL_PREVIEW_HEADERS)) {
            expect(headerCount(response.rawHeaders, name)).toBe(1);
            expect(response.headers[name]).toBe(value);
        }
        expect(response.body).toBe("<html></html>");
    });

    it("Should add the preview headers to responses without any headers of their own", async () => {
        const target = await startTarget((req, res) => res.end());
        const proxy = await startProxy(targetUrl(target));

        const response = await send(proxy, "/");

        expect(response.status).toBe(200);
        for (const [name, value] of Object.entries(LOCAL_PREVIEW_HEADERS)) {
            expect(headerCount(response.rawHeaders, name)).toBe(1);
            expect(response.headers[name]).toBe(value);
        }
    });

    it("Should answer 502 naming the target while it is unreachable and recover once it is up", async () => {
        const port = await freePort();
        const target = new URL(`http://localhost:${port}`);
        const proxy = await startProxy(target);

        const first = await send(proxy, "/");
        const second = await send(proxy, "/");

        expect(first.status).toBe(502);
        expect(first.headers["content-type"]).toBe("text/plain");
        expect(first.body).toContain(target.origin);
        expect(first.headers["content-security-policy"]).toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
        expect(second.status).toBe(502);
        const warnings = loggingTestTransport.logMessages.filter(entry => entry.level.includes("warn"));
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message.trim()).toBe(first.body);

        await startTarget((req, res) => res.end("up"), port);

        const recovered = await send(proxy, "/");

        expect(recovered.status).toBe(200);
        expect(recovered.body).toBe("up");
    });

    it("Should abort the response when the target fails mid-response and keep serving", async () => {
        let calls = 0;
        const target = await startTarget((req, res) => {
            calls++;
            if (calls === 1) {
                res.writeHead(200);
                res.write("partial");
                setImmediate(() => res.destroy());
                return;
            }
            res.end("ok");
        });
        const proxy = await startProxy(targetUrl(target));

        await expect(send(proxy, "/")).rejects.toThrow();
        const next = await send(proxy, "/");

        expect(next.body).toBe("ok");
    });

    it("Should cancel the target request when the client disconnects", async () => {
        let targetRequestClosed: () => void;
        const closed = new Promise<void>(resolve => targetRequestClosed = resolve);
        let clientRequest: http.ClientRequest;
        const target = await startTarget((req, res) => {
            res.writeHead(200);
            res.write("streaming");
            res.on("close", () => targetRequestClosed());
        });
        const proxy = await startProxy(targetUrl(target));

        await new Promise<void>(resolve => {
            clientRequest = https.request(`${proxy.url}/stream`, { ca: certificate.cert, agent: false }, response => {
                response.once("data", () => resolve());
            });
            clientRequest.on("error", () => undefined);
            clientRequest.end();
        });
        clientRequest.destroy();

        await expect(closed).resolves.toBeUndefined();
    });

    it("Should not report the target as unreachable when the client disconnects before it answers", async () => {
        let requestReceived: () => void;
        let targetRequestClosed: () => void;
        const received = new Promise<void>(resolve => requestReceived = resolve);
        const closed = new Promise<void>(resolve => targetRequestClosed = resolve);
        const target = await startTarget((req, res) => {
            res.on("close", () => targetRequestClosed());
            requestReceived();
        });
        const proxy = await startProxy(targetUrl(target));
        const clientRequest = https.request(`${proxy.url}/slow`, { ca: certificate.cert, agent: false });
        clientRequest.on("error", () => undefined);
        clientRequest.end();

        await received;
        clientRequest.destroy();
        await closed;
        await new Promise(resolve => setImmediate(resolve));

        expect(loggingTestTransport.logMessages.filter(entry => entry.level.includes("warn"))).toHaveLength(0);
    });

    it("Should forward WebSocket upgrades to the target", async () => {
        const target = await startTarget((req, res) => res.end());
        let upgradeHost: string;
        target.on("upgrade", (req: http.IncomingMessage, socket: Duplex) => {
            sockets.push(socket);
            upgradeHost = req.headers.host;
            socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
            socket.pipe(socket);
        });
        const proxy = await startProxy(targetUrl(target));

        const echoed = await new Promise<string>((resolve, reject) => {
            const request = https.request(`${proxy.url}/ws`, {
                ca: certificate.cert,
                agent: false,
                headers: { Connection: "Upgrade", Upgrade: "websocket" },
            });
            request.on("upgrade", (response, socket) => {
                sockets.push(socket);
                expect(response.statusCode).toBe(101);
                socket.once("data", data => resolve(data.toString()));
                socket.write("ping");
            });
            request.on("error", reject);
            request.end();
        });

        expect(echoed).toBe("ping");
        expect(upgradeHost).toBe(targetUrl(target).host);
    });

    function sha256(text: string): string {
        return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
    }

    function scriptSrc(response: ProxyResponse): string[] {
        const directive = (response.headers["content-security-policy"] as string)
            .split(";")
            .map(part => part.trim())
            .find(part => part.startsWith("script-src "));
        return directive.split(/\s+/).slice(1);
    }

    function warnings(): string[] {
        return loggingTestTransport.logMessages
            .filter(entry => entry.level.includes("warn"))
            .map(entry => entry.message.trim());
    }

    const reactPreamble = "import { injectIntoGlobalHook } from \"/@react-refresh\";";
    const reactPage = `<html><head><script type="module">${reactPreamble}</script>` +
        "<script type=\"module\" src=\"/@vite/client\"></script></head><body>Grüße</body></html>";

    function startHtmlTarget(html: string): Promise<http.Server> {
        return startTarget((req, res) => {
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "content-length": Buffer.byteLength(html),
            });
            res.end(html);
        });
    }

    it("Should block the inline scripts of a proxied HTML page by default and warn about each once", async () => {
        const proxy = await startProxy(targetUrl(await startHtmlTarget(reactPage)));

        const first = await send(proxy, "/index.html");
        const second = await send(proxy, "/index.html");

        for (const response of [first, second]) {
            expect(response.headers["content-security-policy"]).toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
            expect(response.body).toBe(reactPage);
            expect(response.headers["content-length"]).toBe(String(Buffer.byteLength(reactPage)));
        }
        expect(warnings()).toEqual([
            `Blocking an inline script in /index.html: "${reactPreamble}". Inline scripts are disabled for published apps. ` +
            "You can allow inline scripts during development by passing --allow-inline-scripts.",
        ]);
    });

    it("Should allow the inline scripts of a proxied HTML page when enabled and warn about each once", async () => {
        const inline = reactPreamble;
        const html = reactPage;
        const proxy = await startProxy(targetUrl(await startHtmlTarget(html)), true);

        const first = await send(proxy, "/index.html");
        const second = await send(proxy, "/index.html");

        for (const response of [first, second]) {
            expect(scriptSrc(response)).toEqual(["'self'", sha256(inline)]);
            expect((response.headers["content-security-policy"] as string).replace(` ${sha256(inline)}`, ""))
                .toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
            expect(response.body).toBe(html);
            expect(response.headers["content-length"]).toBe(String(Buffer.byteLength(html)));
            expect(response.headers["content-type"]).toBe("text/html; charset=utf-8");
        }
        expect(warnings()).toEqual([
            `Allowing an inline script in /index.html for the local preview: "${inline}". ` +
            "Inline scripts are disabled for published apps, so they can only be used during development.",
        ]);
    });

    it("Should allow the inline scripts of an HTML page sent without a content-length", async () => {
        const target = await startTarget((req, res) => {
            res.writeHead(200, { "content-type": "text/html" });
            res.write("<html><head><script>a()");
            setImmediate(() => res.end("</script></head></html>"));
        });
        const proxy = await startProxy(targetUrl(target), true);

        const response = await send(proxy, "/");

        expect(scriptSrc(response)).toEqual(["'self'", sha256("a()")]);
        expect(response.body).toBe("<html><head><script>a()</script></head></html>");
        expect(response.headers["content-length"]).toBeUndefined();
    });

    it("Should leave the CSP of non-HTML responses unchanged", async () => {
        const target = await startTarget((req, res) => {
            res.writeHead(200, { "content-type": "text/javascript" });
            res.end("document.write(\"<script>a()</script>\");");
        });
        const proxy = await startProxy(targetUrl(target));

        const response = await send(proxy, "/main.js");

        expect(response.headers["content-security-policy"]).toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
        expect(response.body).toBe("document.write(\"<script>a()</script>\");");
        expect(warnings()).toEqual([]);
    });

    it("Should pass HEAD and 304 responses for HTML through without a body", async () => {
        const target = await startTarget((req, res) => {
            if (req.method === "HEAD") {
                res.writeHead(200, { "content-type": "text/html", "content-length": "42" });
                res.end();
                return;
            }
            res.writeHead(304, { "content-type": "text/html", etag: "\"v1\"" });
            res.end();
        });
        const proxy = await startProxy(targetUrl(target));

        const head = await send(proxy, "/", "HEAD");
        const notModified = await send(proxy, "/");

        expect(head.status).toBe(200);
        expect(head.headers["content-length"]).toBe("42");
        expect(head.body).toBe("");
        expect(head.headers["content-security-policy"]).toBe(LOCAL_PREVIEW_HEADERS["content-security-policy"]);
        expect(notModified.status).toBe(304);
        expect(notModified.headers.etag).toBe("\"v1\"");
        expect(notModified.body).toBe("");
    });

    it("Should abort an HTML response when the target fails mid-body and keep serving", async () => {
        let calls = 0;
        const target = await startTarget((req, res) => {
            calls++;
            res.writeHead(200, { "content-type": "text/html" });
            if (calls === 1) {
                res.write("<html><script>a()");
                setImmediate(() => res.destroy());
                return;
            }
            res.end("<html></html>");
        });
        const proxy = await startProxy(targetUrl(target));

        await expect(send(proxy, "/")).rejects.toThrow();
        const next = await send(proxy, "/");

        expect(next.status).toBe(200);
        expect(next.body).toBe("<html></html>");
        expect(warnings()).toEqual([]);
    });

    it("Should ask the target for an uncompressed response", async () => {
        let acceptEncoding: string | string[];
        const target = await startTarget((req, res) => {
            acceptEncoding = req.headers["accept-encoding"];
            res.end();
        });
        const proxy = await startProxy(targetUrl(target));

        await new Promise<void>((resolve, reject) => {
            const request = https.request(`${proxy.url}/`, {
                ca: certificate.cert,
                agent: false,
                headers: { "Accept-Encoding": "gzip, deflate, br" },
            }, response => {
                response.resume();
                response.on("end", () => resolve());
            });
            request.on("error", reject);
            request.end();
        });

        expect(acceptEncoding).toBe("identity");
    });

    it("Should fail with a clear error when the port is already in use", async () => {
        const blocker = net.createServer();
        blockers.push(blocker);
        const busyPort = await new Promise<number>(resolve => {
            blocker.listen(0, "localhost", () => resolve((blocker.address() as net.AddressInfo).port));
        });
        const options: PreviewProxyOptions = {
            target: new URL("http://localhost:1"),
            port: busyPort,
            certificate,
            headers: LOCAL_PREVIEW_HEADERS,
            allowInlineScripts: false,
        };

        await expect(startPreviewProxy(options)).rejects.toThrow(`Port ${busyPort} is already in use`);
    });
});
