export class BranchUtils {
    private static readonly BRANCH_SEPARATOR = "@";

    public static isBranchPackageKey(packageKey: string): boolean {
        if (!packageKey || packageKey.trim().length === 0) {
            throw new Error("Package key cannot be empty");
        }

        return packageKey.includes(BranchUtils.BRANCH_SEPARATOR);
    }
}