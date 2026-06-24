import { FatalError } from "../../core/utils/logger";

export const ASSET_REGISTRY_DISABLED_ERROR = "Asset registry feature is currently disabled";

export const ASSET_REGISTRY_DISABLED_USER_MESSAGE =
    "Asset registry is not enabled for this team. Contact your administrator to enable the feature.";

function extractErrorText(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

function parseErrorField(error: unknown): string | undefined {
    const payload = extractJsonPayload(extractErrorText(error));
    if (!payload) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(payload) as { error?: unknown };
        return typeof parsed.error === "string" ? parsed.error : undefined;
    } catch {
        return undefined;
    }
}

function extractJsonPayload(text: string): string | undefined {
    let candidate = text.trim();

    const fatalErrorPrefix = "FatalError: ";
    const fatalErrorIndex = candidate.lastIndexOf(fatalErrorPrefix);
    if (fatalErrorIndex >= 0) {
        candidate = candidate.slice(fatalErrorIndex + fatalErrorPrefix.length).trim();
    }

    if (!candidate.startsWith("{")) {
        return undefined;
    }

    return candidate;
}

export function handleAssetRegistryApiError(operation: string, error: unknown): never {
    if (parseErrorField(error) === ASSET_REGISTRY_DISABLED_ERROR) {
        throw new FatalError(ASSET_REGISTRY_DISABLED_USER_MESSAGE);
    }
    throw new FatalError(`Problem ${operation}: ${extractErrorText(error)}`);
}
