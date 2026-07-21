import { isFeatureDisabledError } from "../../../src/core/feature-flag/feature-disabled-error";
import { FatalError } from "../../../src/core/utils/logger";

describe("isFeatureDisabledError", () => {
    it("returns true for a backend feature-disabled body", () => {
        expect(isFeatureDisabledError(new Error('{"errorCode":"feature-disabled","feature":"pacman.branching"}'))).toBe(true);
    });

    it("returns true when the body is wrapped by FatalError (prefixed)", () => {
        expect(isFeatureDisabledError(new FatalError('FatalError: {"errorCode":"feature-disabled"}'))).toBe(true);
    });

    it("returns true for a raw string payload", () => {
        expect(isFeatureDisabledError('{"errorCode":"feature-disabled"}')).toBe(true);
    });

    it("returns false for a different backend error code", () => {
        expect(isFeatureDisabledError(new Error('{"errorCode":"optimistic-lock"}'))).toBe(false);
    });

    it("returns false for a non-JSON error", () => {
        expect(isFeatureDisabledError(new Error("Backend responded with status code 403"))).toBe(false);
    });

    it("returns false when a brace is present but the payload is not valid JSON", () => {
        expect(isFeatureDisabledError(new Error("something { not valid json"))).toBe(false);
    });

    it("returns false when errorCode is not a string", () => {
        expect(isFeatureDisabledError(new Error('{"errorCode":123}'))).toBe(false);
    });

    it("returns false for undefined / non-error input", () => {
        expect(isFeatureDisabledError(undefined)).toBe(false);
        expect(isFeatureDisabledError(42)).toBe(false);
    });
});
