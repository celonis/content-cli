import { ContentService } from "../services/content.service";
import { PackageManagerFactory } from "../content/factory/package-manager.factory";

export class PackageCommand {
    private contentService = new ContentService();
    private packageManagerFactory = new PackageManagerFactory();

    public async pullPackage(
        profile: string,
        key: string,
        store: boolean,
        newKey: string,
        draft: boolean
    ): Promise<void> {
        await this.contentService.pullFile(
            profile,
            this.packageManagerFactory.createPullManager(key, store, newKey, draft)
        );
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

    public async listPackages(profile: string, responseType: string, includeDependencies : boolean): Promise<void> {
        if(responseType === "json") {
            await this.contentService.findAllAndExport(profile, this.packageManagerFactory.createListManager(responseType, includeDependencies));
        }else {
            await this.contentService.findAll(profile, this.packageManagerFactory.createListManager(responseType, includeDependencies));

        }
    }
}
