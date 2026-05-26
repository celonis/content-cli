import { FatalError } from "../../../src/core/utils/logger";
import {
    ASSET_REGISTRY_DISABLED_ERROR,
    ASSET_REGISTRY_DISABLED_USER_MESSAGE,
    handleAssetRegistryApiError,
} from "../../../src/commands/asset-registry/asset-registry-error";
import { mockAxiosGetError } from "../../utls/http-requests-mock";
import { AssetRegistryService } from "../../../src/commands/asset-registry/asset-registry.service";
import { testContext } from "../../utls/test-context";

const TYPES_URL = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/types";
const SKILLS_URL = "https://myTeam.celonis.cloud/pacman/api/core/asset-registry/skills";

describe("Asset registry error handling", () => {
    describe("handleAssetRegistryApiError", () => {
        it("Should throw a friendly message when the asset registry feature flag is disabled", () => {
            const errorBody = JSON.stringify({ error: ASSET_REGISTRY_DISABLED_ERROR });

            expect(() => handleAssetRegistryApiError("listing asset registry types", errorBody))
                .toThrow(new FatalError(ASSET_REGISTRY_DISABLED_USER_MESSAGE));
        });

        it("Should detect the disabled flag when the error is wrapped by HttpClient and AssetRegistryApi", () => {
            const wrappedError = new FatalError(
                `Problem listing asset registry types: FatalError: ${JSON.stringify({ error: ASSET_REGISTRY_DISABLED_ERROR })}`
            );

            expect(() => handleAssetRegistryApiError("listing asset registry types", wrappedError))
                .toThrow(new FatalError(ASSET_REGISTRY_DISABLED_USER_MESSAGE));
        });

        it("Should preserve generic errors for other 403 responses", () => {
            const errorBody = JSON.stringify({ error: "Access denied" });

            expect(() => handleAssetRegistryApiError("listing asset registry types", errorBody))
                .toThrow(new FatalError(`Problem listing asset registry types: ${errorBody}`));
        });

        it("Should preserve generic errors for 404 responses", () => {
            const errorBody = JSON.stringify({ error: "Not found" });

            expect(() => handleAssetRegistryApiError("getting asset type 'UNKNOWN'", errorBody))
                .toThrow(new FatalError(`Problem getting asset type 'UNKNOWN': ${errorBody}`));
        });

        it("Should preserve generic errors for 500 responses", () => {
            const errorBody = "Backend responded with status code 500";

            expect(() => handleAssetRegistryApiError("getting schema for asset type 'BOARD_V2'", errorBody))
                .toThrow(new FatalError(`Problem getting schema for asset type 'BOARD_V2': ${errorBody}`));
        });
    });

    describe("AssetRegistryService integration", () => {
        it("Should surface the friendly message when listing types and the feature flag is disabled", async () => {
            mockAxiosGetError(TYPES_URL, 403, { error: ASSET_REGISTRY_DISABLED_ERROR });

            await expect(new AssetRegistryService(testContext).listTypes(false))
                .rejects.toThrow(new FatalError(ASSET_REGISTRY_DISABLED_USER_MESSAGE));
        });

        it("Should surface the friendly message when listing skills and the feature flag is disabled", async () => {
            mockAxiosGetError(SKILLS_URL, 403, { error: ASSET_REGISTRY_DISABLED_ERROR });

            await expect(new AssetRegistryService(testContext).listSkills(false))
                .rejects.toThrow(new FatalError(ASSET_REGISTRY_DISABLED_USER_MESSAGE));
        });

        it("Should surface a generic error for other 403 responses", async () => {
            const errorBody = { error: "Access denied" };
            mockAxiosGetError(TYPES_URL, 403, errorBody);

            await expect(new AssetRegistryService(testContext).listTypes(false))
                .rejects.toThrow(/Problem listing asset registry types:/);
        });
    });
});
