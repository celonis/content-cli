import * as fs from "fs";
import * as path from "path";
import { AssetManager } from "./asset.manager";
import { FatalError, logger } from "../../../core/utils/logger";
import { Context } from "../../../core/command/cli-context";

export class AssetManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createManager(key?: string, fileName?: string, packageKey?: string): AssetManager {
        const assetManager = new AssetManager(this.context);
        assetManager.key = key;

        if (fileName) {
            assetManager.content = this.readFile(fileName);
        }

        assetManager.packageKey = packageKey;
        return assetManager;
    }

    public createManagers(packageKey: string): AssetManager[] {
        const filePaths = fs.readdirSync(process.cwd());

        return filePaths
            .filter(filePath => {
                if (!this.isAssetFilePath(filePath)) {
                    return false;
                }

                const file = fs.lstatSync(filePath);
                return file.isFile();
            })
            .map(filePath => {
                return this.createManager(null, filePath, packageKey);
            });
    }

    private isAssetFilePath(filePath: string): boolean {
        return (
            filePath.startsWith(AssetManager.ASSET_FILE_PREFIX) &&
            (filePath.endsWith("yml") || filePath.endsWith("yaml"))
        );
    }

    private readFile(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), fileName), { encoding: "utf-8" });
    }
}
