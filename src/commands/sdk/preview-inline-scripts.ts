import { createHash } from "node:crypto";

export interface InlineScript {
    /** `'sha256-<base64>'`, quoted and ready for a CSP source list. */
    hash: string;
    /** The first 60 characters of the script text, with whitespace collapsed. */
    excerpt: string;
}

const SCRIPT_ELEMENT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const SRC_ATTRIBUTE = /(?:^|[\s/])src(?=[\s=/]|$)/i;
const EXCERPT_LENGTH = 60;

/**
 * The inline scripts (`<script>` without `src`) of an HTML document, distinct by hash and in document order.
 * Each hash covers the script text as the browser parses it for CSP (line endings normalized to LF).
 */
export function inlineScriptHashes(html: string): InlineScript[] {
    const scripts = new Map<string, InlineScript>();
    for (const [, attributes, text] of html.matchAll(SCRIPT_ELEMENT)) {
        if (SRC_ATTRIBUTE.test(attributes) || text.length === 0) {
            continue;
        }
        // Browsers hash the parsed text, and the HTML parser turns CRLF and lone CR into LF.
        const parsedText = text.replace(/\r\n?/g, "\n");
        const hash = `'sha256-${createHash("sha256").update(parsedText, "utf8").digest("base64")}'`;
        if (!scripts.has(hash)) {
            scripts.set(hash, { hash, excerpt: text.replace(/\s+/g, " ").trim().slice(0, EXCERPT_LENGTH) });
        }
    }
    return [...scripts.values()];
}

/** Appends the hashes to the policy's `script-src` directive and leaves every other directive unchanged. */
export function allowInlineScripts(csp: string, hashes: readonly string[]): string {
    if (hashes.length === 0) {
        return csp;
    }
    return csp
        .split(";")
        .map(directive => /^\s*script-src(\s|$)/i.test(directive)
            ? `${directive.trimEnd()} ${hashes.join(" ")}`
            : directive)
        .join(";");
}
