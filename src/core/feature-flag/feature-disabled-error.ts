/**
 * Recognizes the backend's "feature not enabled" response so the CLI can surface a
 * clear message instead of a raw error. Enforcement stays entirely in the backend
 * (pacman); the CLI only translates the response — it never decides entitlement.
 *
 * The backend rejects a flag-gated request with 403 and a machine-readable body:
 * {"errorCode":"feature-disabled", ...} (pacman's standard ErrorTransport). Keying
 * off the stable code (rather than a free-text message) keeps this robust.
 */
export const FEATURE_DISABLED_CODE = "feature-disabled";

/**
 * True when the given error represents a backend "feature disabled" rejection.
 * HttpClient rejects with the stringified response body (often wrapped as
 * "FatalError: {json}"), so we extract and parse the embedded JSON payload.
 */
export function isFeatureDisabledError(error: unknown): boolean {
    return extractErrorCode(error) === FEATURE_DISABLED_CODE;
}

function extractErrorCode(error: unknown): string | undefined {
    let text = "";
    if (error instanceof Error) {
        text = error.message;
    } else if (typeof error === "string") {
        text = error;
    }
    const jsonStart = text.indexOf("{");
    if (jsonStart === -1) {
        return undefined;
    }
    try {
        const payload = JSON.parse(text.slice(jsonStart));
        return typeof payload.errorCode === "string" ? payload.errorCode : undefined;
    } catch {
        return undefined;
    }
}
