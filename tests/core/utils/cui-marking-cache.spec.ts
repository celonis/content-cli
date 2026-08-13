import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Context } from "../../../src/core/command/cli-context";
import { CuiMarkingCache } from "../../../src/core/utils/cui-marking-cache";
import { testContext } from "../../utls/test-context";

describe("CuiMarkingCache", () => {
    const DECISION = { marking: "DISABLED" };

    const configuredDirectory = process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE];

    afterEach(() => {
        process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE] = configuredDirectory;
    });

    it("Should keep the decision between two instances", () => {
        new CuiMarkingCache(testContext).write(DECISION);

        expect(new CuiMarkingCache(testContext).read()).toEqual(DECISION);
    });

    it("Should forget the decision once cleared", () => {
        const cache = new CuiMarkingCache(testContext);
        cache.write(DECISION);

        cache.clear();

        expect(cache.read()).toBeUndefined();
    });

    it("Should do nothing when the profile has no team", () => {
        const cache = new CuiMarkingCache(new Context({}));

        cache.write(DECISION);

        expect(cache.read()).toBeUndefined();
        expect(() => cache.clear()).not.toThrow();
    });

    it("Should stay quiet when the location cannot be written", () => {
        const blockingFile = resolve(process.cwd(), "not-a-directory");
        writeFileSync(blockingFile, "");
        process.env[CuiMarkingCache.CACHE_DIRECTORY_ENV_VARIABLE] = join(blockingFile, "cache");

        const cache = new CuiMarkingCache(testContext);
        cache.write(DECISION);

        expect(cache.read()).toBeUndefined();
    });
});
