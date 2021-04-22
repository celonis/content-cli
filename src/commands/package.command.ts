import { ContentService } from "../services/content.service";
import { PackageManagerFactory } from "../content/factory/package-manager.factory";

export class PackageCommand {
    private contentService = new ContentService();
    private packageManagerFactory = new PackageManagerFactory();

    public async pullPackage(profile: string, key: string, store: boolean, newKey: string): Promise<void> {
        await this.contentService.pullFile(
            profile,
            this.packageManagerFactory.createManager(key, null, null, store, newKey)
        );
    }

    public async pushPackage(
        profile: string,
        spaceId: string,
        fileName: string,
        newKey: string,
        overwrite: boolean
    ): Promise<void> {
        await this.contentService.push(
            profile,
            this.packageManagerFactory.createManager(null, spaceId, fileName, false, newKey, overwrite)
        );
    }

    public async pushPackages(profile: string): Promise<void> {
        await this.contentService.batchPush(profile, this.packageManagerFactory.createManagers());
    }

    public async listPackages(profile: string): Promise<void> {
        await this.contentService.findAll(profile, this.packageManagerFactory.createManager());
    }
}
