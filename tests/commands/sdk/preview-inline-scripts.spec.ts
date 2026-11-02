import { createHash } from "node:crypto";
import { allowInlineScripts, inlineScriptHashes } from "../../../src/commands/sdk/preview-inline-scripts";

function sha256(text: string): string {
    return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

describe("Preview inline scripts", () => {
    describe("inlineScriptHashes", () => {
        it("Should hash the exact text of every inline script and skip scripts with src", () => {
            const html = "<head><script type=\"module\">import { injectIntoGlobalHook } from \"/@react-refresh\";</script>" +
                "<script type=\"module\" src=\"/@vite/client\"></script><SCRIPT>a()</SCRIPT></head>";

            expect(inlineScriptHashes(html).map(script => script.hash)).toEqual([
                sha256("import { injectIntoGlobalHook } from \"/@react-refresh\";"),
                sha256("a()"),
            ]);
        });

        it("Should list a script that appears twice only once", () => {
            const html = "<script>a()</script><p></p><script>b()</script><script>a()</script>";

            expect(inlineScriptHashes(html).map(script => script.hash)).toEqual([sha256("a()"), sha256("b()")]);
        });

        it("Should keep whitespace and non-ASCII characters in the hashed text", () => {
            const text = "\n  window.greeting = \"Grüße\";\n";

            expect(inlineScriptHashes(`<script>${text}</script>`)[0].hash).toBe(sha256(text));
        });

        it("Should hash the text with line endings normalized to LF, as the HTML parser does", () => {
            const html = "<script>\r\na();\r\nb();\rc();\r\n</script>";

            expect(inlineScriptHashes(html)[0].hash).toBe(sha256("\na();\nb();\nc();\n"));
        });

        it("Should treat src in any case or position as an external script", () => {
            const html = "<script SRC='/a.js'></script><script type=module\nsrc=/b.js></script><script data-src=\"x\">c()</script>";

            expect(inlineScriptHashes(html).map(script => script.hash)).toEqual([sha256("c()")]);
        });

        it("Should skip empty inline scripts", () => {
            expect(inlineScriptHashes("<script></script><script type=\"module\"></script>")).toEqual([]);
        });

        it("Should give an excerpt of the first 60 characters with whitespace collapsed", () => {
            const text = "\n    import { injectIntoGlobalHook } from \"/@react-refresh\";\n    injectIntoGlobalHook(window);\n";

            expect(inlineScriptHashes(`<script>${text}</script>`)[0].excerpt)
                .toBe("import { injectIntoGlobalHook } from \"/@react-refresh\"; inje");
        });
    });

    describe("allowInlineScripts", () => {
        it("Should add hashes to script-src only", () => {
            expect(allowInlineScripts("default-src 'none'; script-src 'self'; style-src 'self'", ["'sha256-x'"]))
                .toBe("default-src 'none'; script-src 'self' 'sha256-x'; style-src 'self'");
        });

        it("Should add several hashes in order", () => {
            expect(allowInlineScripts("script-src 'self'; style-src 'self'", ["'sha256-x'", "'sha256-y'"]))
                .toBe("script-src 'self' 'sha256-x' 'sha256-y'; style-src 'self'");
        });

        it("Should leave the policy unchanged without hashes", () => {
            const csp = "default-src 'none'; script-src 'self'";

            expect(allowInlineScripts(csp, [])).toBe(csp);
        });
    });
});
