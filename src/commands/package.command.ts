import { ContentService } from "../services/content.service";
import { PackageManagerFactory } from "../content/factory/package-manager.factory";

export class PackageCommand {
    private contentService = new ContentService();
    private packageManagerFactory = new PackageManagerFactory();

    public async pullPackage(profile: string, key: string) {
        await this.contentService.pullFile(profile, this.packageManagerFactory.createManager(key, null));
    }

    public async pushPackage(profile: string, fileName: string) {
        await this.contentService.push(profile, this.packageManagerFactory.createManager(null, fileName));
    }

    public async pushPackages(profile: string) {
        await this.contentService.batchPush(profile, this.packageManagerFactory.createManagers());
    }
}
