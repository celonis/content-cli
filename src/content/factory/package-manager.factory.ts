import * as fs from "fs";
import * as path from "path";

import { FatalError, logger } from "../../util/logger";
import { PackageManager } from "../manager/package.manager";

export class PackageManagerFactory {
    public createManager(key?: string, fileName?: string): PackageManager {
        const packageManager = new PackageManager();
        packageManager.key = key;

        if (fileName) {
            packageManager.fileName = this.resolvePackageFilePath(fileName);
        }

        return packageManager;
    }

    public createManagers(): PackageManager[] {
        const filePaths = fs.readdirSync(process.cwd());

        return filePaths
            .filter(filePath => {
                if (!this.isPackageFilePath(filePath)) {
                    return false;
                }

                const file = fs.lstatSync(filePath);
                return file.isFile();
            })
            .map(filePath => {
                return this.createManager(null, filePath);
            });
    }

    private isPackageFilePath(filePath: string): boolean {
        return (
            filePath.startsWith(PackageManager.PACKAGE_FILE_PREFIX) &&
            filePath.endsWith(PackageManager.PACKAGE_FILE_EXTENSION)
        );
    }

    private resolvePackageFilePath(fileName: string): string {
        if (!fs.existsSync(path.resolve(process.cwd(), fileName))) {
            logger.error(new FatalError("The provided file does not exit"));
        }

        return path.resolve(process.cwd(), fileName);
    }
}