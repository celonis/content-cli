import {ContentService} from "../services/content.service";
import {PackageManagerFactory} from "../content/factory/package-manager.factory";
import {packageService} from "../services/package-manager/package-service";

export class PackageCommand {
    private contentService = new ContentService();
    private packageManagerFactory = new PackageManagerFactory();

    public async pullPackage(
        key: string,
        store: boolean,
        newKey: string,
        draft: boolean,
        packageKeys?: string[],
        includeDependencies?: boolean,
    ): Promise<void> {
        if (packageKeys && packageKeys.length) {
            await packageService.pullPackages(packageKeys,includeDependencies)
        } else {
            await packageService.pullPackage(key, store, newKey, draft);

        }
    }

    public async pushPackage(
        profile: string,
        spaceKey: string,
        fileName: string,
        newKey: string,
        overwrite: boolean
    ): Promise<void> {
        await this.contentService.push(
            profile,
            this.packageManagerFactory.createPushManager(spaceKey, fileName, newKey, overwrite)
        );
    }

    public async pushPackages(profile: string, spaceKey: string): Promise<void> {
        await this.contentService.batchPush(profile, this.packageManagerFactory.createPushManagers(spaceKey));
    }

    public async listPackages(jsonResponse: boolean, includeDependencies: boolean): Promise<void> {
        if (jsonResponse) {
            await packageService.findAndExportAllPackages(includeDependencies);
        } else {
            await packageService.listPackages();
        }
    }
}
