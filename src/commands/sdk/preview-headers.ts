/**
 * Copied from `localPreviewHeaders()` in ems-frontend `libs/common/fragments/sandbox/src/lib/policy.ts`,
 * whose spec fails when the gateway policy drifts. Update both together.
 */
export const LOCAL_PREVIEW_HEADERS: Readonly<Record<string, string>> = {
    "content-security-policy":
        "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'none'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors https://*.celonis.cloud http://localhost:*; sandbox allow-scripts",
    "permissions-policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), clipboard-read=(), clipboard-write=(), display-capture=()",
    "access-control-allow-origin": "*",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
};
