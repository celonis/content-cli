import { createPrivateKey, X509Certificate } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "selfsigned";

export interface PreviewCertificate {
    key: string;
    cert: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const CERT_FILE = "localhost-cert.pem";
const KEY_FILE = "localhost-key.pem";

export async function loadOrCreatePreviewCertificate(directory: string, now: Date = new Date()): Promise<PreviewCertificate> {
    const existing = readUsableCertificate(directory, now);
    if (existing) {
        return existing;
    }

    const generated = await generate([{ name: "commonName", value: "localhost" }], {
        keyType: "ec",
        curve: "P-256",
        algorithm: "sha256",
        notBeforeDate: now,
        notAfterDate: new Date(now.getTime() + 365 * DAY_MS),
        extensions: [
            {
                name: "subjectAltName",
                altNames: [
                    { type: 2, value: "localhost" },
                    { type: 7, ip: "127.0.0.1" },
                    { type: 7, ip: "::1" },
                ],
            },
        ],
    });
    const certificate: PreviewCertificate = { key: generated.private, cert: generated.cert };

    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, CERT_FILE), certificate.cert);
    writeFileSync(join(directory, KEY_FILE), certificate.key, { mode: 0o600 });
    return certificate;
}

function readUsableCertificate(directory: string, now: Date): PreviewCertificate | null {
    const certPath = join(directory, CERT_FILE);
    const keyPath = join(directory, KEY_FILE);
    if (!existsSync(certPath) || !existsSync(keyPath)) {
        return null;
    }
    try {
        const cert = readFileSync(certPath, "utf8");
        const key = readFileSync(keyPath, "utf8");
        const x509 = new X509Certificate(cert);
        if (!x509.checkPrivateKey(createPrivateKey(key))) {
            return null;
        }
        if (new Date(x509.validTo).getTime() - now.getTime() <= DAY_MS) {
            return null;
        }
        return { key, cert };
    } catch {
        return null;
    }
}
