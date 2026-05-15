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
});
