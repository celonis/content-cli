export class BranchUtils {
    private static readonly BRANCH_SEPARATOR = "@";

    /**
     * Checks if a package key represents a branch.
     * @param packageKey The string to check
     * @throws Error if the package key is null, undefined, or empty/whitespace
     */
    public static isBranchPackageKey(packageKey: string): boolean {
        if (!packageKey || packageKey.trim().length === 0) {
            throw new Error("Package key cannot be empty");
        }

        return packageKey.includes(BranchUtils.BRANCH_SEPARATOR);
    }
}