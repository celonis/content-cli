export class BranchUtils {
    public static readonly MAIN_BRANCH_KEY = "main";
    private static readonly BRANCH_SEPARATOR = "@";

    public static isBranchPackageKey(packageKey: string): boolean {
        if (!packageKey || packageKey.trim().length === 0) {
            throw new Error("Package key cannot be empty");
        }

        return packageKey.includes(BranchUtils.BRANCH_SEPARATOR);
    }

    public static constructBranchKey(projectKey: string, branchKey: string): string {
        return `${projectKey}${BranchUtils.BRANCH_SEPARATOR}${branchKey}`;
    }

    public static extractProjectKey(packageKey: string): string {
        if (!BranchUtils.isBranchPackageKey(packageKey)) {
            return packageKey;
        }

        return packageKey.substring(0, packageKey.indexOf(BranchUtils.BRANCH_SEPARATOR));
    }
}