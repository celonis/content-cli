import { BranchUtils } from "../../../../src/commands/configuration-management/branch/branch-utils";

describe("BranchUtils", () => {

    describe("isBranchPackageKey", () => {
        it("returns true when the key contains '@'", () => {
            expect(BranchUtils.isBranchPackageKey("main@branch-123")).toBe(true);
        });

        it("returns false when the key has no '@'", () => {
            expect(BranchUtils.isBranchPackageKey("my-main-package")).toBe(false);
        });

        it("returns false for an empty key", () => {
            expect(BranchUtils.isBranchPackageKey("")).toBe(false);
        });
    });

    describe("constructBranchKey", () => {
        it("appends the branch key to the project key with '@'", () => {
            expect(BranchUtils.constructBranchKey("main-pkg", "feat-1")).toEqual("main-pkg@feat-1");
        });
    });

    describe("extractProjectKey", () => {
        it("returns the same key for a main package", () => {
            expect(BranchUtils.extractProjectKey("main-pkg")).toEqual("main-pkg");
        });

        it("returns the project key for a branch package", () => {
            expect(BranchUtils.extractProjectKey("main-pkg@feat-1")).toEqual("main-pkg");
        });

        it("splits on the first '@'", () => {
            expect(BranchUtils.extractProjectKey("main-pkg@team@feat")).toEqual("main-pkg");
        });
    });

    describe("extractBranchKey", () => {
        it("returns the branch suffix for a branch package", () => {
            expect(BranchUtils.extractBranchKey("main-pkg@feat-1")).toEqual("feat-1");
        });

        it("keeps any later '@' in the branch suffix", () => {
            expect(BranchUtils.extractBranchKey("main-pkg@team@feat")).toEqual("team@feat");
        });

        it("returns null for a main package", () => {
            expect(BranchUtils.extractBranchKey("main-pkg")).toBeNull();
        });

        it("returns null for an empty key", () => {
            expect(BranchUtils.extractBranchKey("")).toBeNull();
        });
    });
});
