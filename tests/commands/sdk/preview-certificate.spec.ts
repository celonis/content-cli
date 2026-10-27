import { createPrivateKey, X509Certificate } from "node:crypto";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadOrCreatePreviewCertificate } from "../../../src/commands/sdk/preview-certificate";
import { makeTempDir, rmTempDir } from "../../utls/fs-utils";

describe("Preview certificate", () => {
    let dir: string;

    beforeEach(() => {
        dir = makeTempDir();
    });

    afterEach(() => {
        rmTempDir(dir);
    });

    it("Should create a localhost certificate and reuse it on the next run", async () => {
        const first = await loadOrCreatePreviewCertificate(dir);
        const second = await loadOrCreatePreviewCertificate(dir);
        expect(second).toEqual(first);
        const x509 = new X509Certificate(first.cert);
        expect(x509.subjectAltName).toContain("DNS:localhost");
        expect(x509.subjectAltName).toContain("IP Address:127.0.0.1");
        expect(x509.checkPrivateKey(createPrivateKey(first.key))).toBe(true);
    });

    it("Should regenerate a certificate that expires within a day", async () => {
        const first = await loadOrCreatePreviewCertificate(dir);
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        expect((await loadOrCreatePreviewCertificate(dir, nextYear)).cert).not.toBe(first.cert);
    });

    it("Should regenerate unreadable certificate files", async () => {
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "localhost-cert.pem"), "garbage");
        writeFileSync(join(dir, "localhost-key.pem"), "garbage");
        const certificate = await loadOrCreatePreviewCertificate(dir);
        expect(() => new X509Certificate(certificate.cert)).not.toThrow();
    });

    it("Should keep the private key readable only by the user", async () => {
        await loadOrCreatePreviewCertificate(dir);
        if (process.platform !== "win32") {
            expect(statSync(join(dir, "localhost-key.pem")).mode & 0o077).toBe(0);
        }
    });
});
