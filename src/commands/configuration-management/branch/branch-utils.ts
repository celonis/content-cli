export class BranchUtils {

    public static readonly MAIN_BRANCH_KEY = "main";
    private static readonly BRANCH_SEPARATOR = "@";

    public static isBranchPackageKey(packageKey: string): boolean {
        return !!packageKey && packageKey.indexOf(BranchUtils.BRANCH_SEPARATOR) >= 0;
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

    public static extractBranchKey(packageKey: string): string | null {
        if (!BranchUtils.isBranchPackageKey(packageKey)) {
            return null;
        }
        return packageKey.substring(packageKey.indexOf(BranchUtils.BRANCH_SEPARATOR) + 1);
    }
}
