import { ContentService } from "../../../core/http/http-shared/content.service";
import { Context } from "../../../core/command/cli-context";
import { PackageManagerFactory } from "../manager/package.manager-factory";
import { PackageService } from "../service/package.service";

export class PackageCommandService {
    private contentService = new ContentService();
    private packageManagerFactory: PackageManagerFactory;

    private packageService: PackageService;

    constructor(context: Context) {
        this.packageManagerFactory = new PackageManagerFactory(context);
        this.packageService = new PackageService(context);
    }

    public async pullPackage(
        key: string,
        store: boolean,
        newKey: string,
        draft: boolean
    ): Promise<void> {
        await this.contentService.pullFile(
            this.packageManagerFactory.createPullManager(key, store, newKey, draft)
        );
    }

    public async pushPackage(
        spaceKey: string,
        fileName: string,
        newKey: string,
        overwrite: boolean
    ): Promise<void> {
        await this.contentService.push(
            this.packageManagerFactory.createPushManager(spaceKey, fileName, newKey, overwrite)
        );
    }

    public async pushPackages(spaceKey: string): Promise<void> {
        await this.contentService.batchPush(this.packageManagerFactory.createPushManagers(spaceKey));
    }

    public async listPackages(jsonResponse: boolean, includeDependencies: boolean, packageKeys: string[]): Promise<void> {
        if (jsonResponse) {
            await this.packageService.findAndExportListOfAllPackages(includeDependencies, packageKeys ?? []);
        } else {
            await this.packageService.listPackages();
        }
    }

    public async batchExportPackages(packageKeys: string[], includeDependencies: boolean, excludeActionFlows?: boolean): Promise<void> {
        await this.packageService.batchExportPackages(packageKeys, includeDependencies, excludeActionFlows);
    }

    public async batchImportPackages(spaceMappings: string[], dataModelMappingsFilePath: string, exportedPackagesFile: string, overwrite: boolean, excludeActionFlows?: boolean): Promise<void> {
        await this.packageService.batchImportPackages(spaceMappings ?? [], dataModelMappingsFilePath, exportedPackagesFile, overwrite, excludeActionFlows);
    }
}
