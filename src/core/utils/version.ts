import * as fs from "fs";

export class VersionUtils {
    public static async getCurrentCliVersion(): Promise<string> {
        const { packageUp } = await import("package-up");
        const packageJsonPath = await packageUp();
        if (!packageJsonPath) {
            throw new Error("Could not find package.json");
        }

        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        return pkg.version;
    }
}
