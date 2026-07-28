import { BranchUtils } from "../../../src/core/utils/branches";

describe("BranchUtils", () => {
    describe("isBranchPackageKey", () => {
        it("should return true when package key contains branch separator", () => {
            expect(BranchUtils.isBranchPackageKey("package@feature-branch")).toBe(true);
        });

        it("should return false when package key does not contain branch separator", () => {
            expect(BranchUtils.isBranchPackageKey("package")).toBe(false);
        });

        it("should throw an error if the input is empty", () => {
            expect(() => BranchUtils.isBranchPackageKey("")).toThrow("Package key cannot be empty");
        });

        it("should throw an error if the input is only whitespace", () => {
            expect(() => BranchUtils.isBranchPackageKey("   ")).toThrow("Package key cannot be empty");
        });

        it("should throw an error if the input is null", () => {
            expect(() => BranchUtils.isBranchPackageKey(null)).toThrow("Package key cannot be empty");
        });
    });

    describe("constructBranchKey", () => {
        it("should append the branch key to the project key with the separator", () => {
            expect(BranchUtils.constructBranchKey("main-pkg", "feat-1")).toEqual("main-pkg@feat-1");
        });
    });

    describe("extractProjectKey", () => {
        it("should return the same key for a main package", () => {
            expect(BranchUtils.extractProjectKey("main-pkg")).toEqual("main-pkg");
        });

        it("should return the project key for a branch package", () => {
            expect(BranchUtils.extractProjectKey("main-pkg@feat-1")).toEqual("main-pkg");
        });

        it("should split on the first separator", () => {
            expect(BranchUtils.extractProjectKey("main-pkg@team@feat")).toEqual("main-pkg");
        });

        it("should throw an error if the input is empty", () => {
            expect(() => BranchUtils.extractProjectKey("")).toThrow("Package key cannot be empty");
        });
    });
});
