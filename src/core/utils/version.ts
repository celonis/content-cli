import * as fs from "fs";
import * as findUp from "find-up";

export class VersionUtils {
    public static async getCurrentCliVersion(): Promise<string> {
        const packageJsonPath = await findUp("package.json");
        if (!packageJsonPath) {
            throw new Error("Could not find package.json");
        }

        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        return pkg.version;
    }
}
