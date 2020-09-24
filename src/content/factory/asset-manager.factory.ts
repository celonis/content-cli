import * as fs from "fs";
import * as path from "path";

import { FatalError, logger } from "../../util/logger";
import { AssetManager } from "../manager/asset.manager";

export class AssetManagerFactory {
    public createManager(key?: string, fileName?: string, packageKey?: string): AssetManager {
        const assetManager = new AssetManager();
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
                if (!filePath.endsWith("yml") && !filePath.endsWith("yaml")) {
                    return false;
                }

                const file = fs.lstatSync(filePath);
                return file.isFile();
            })
            .map(filePath => {
                return this.createManager(null, filePath, packageKey);
            });
    }

    private readFile(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exit"));
        }
        return fs.readFileSync(path.resolve(process.cwd(), fileName), { encoding: "utf-8" });
    }
}
