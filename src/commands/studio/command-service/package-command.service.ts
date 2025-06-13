import { Context } from "../../../core/command/cli-context";
import { PackageManagerFactory } from "../manager/package.manager-factory";
import { PackageService } from "../service/package.service";
import { BaseManagerHelper } from "../../../core/http/http-shared/base.manager.helper";

export class PackageCommandService {
    private baseManagerHelper = new BaseManagerHelper();
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
        await this.packageManagerFactory.createPullManager(key, store, newKey, draft).pullFile();
    }

    public async pushPackage(
        spaceKey: string,
        fileName: string,
        newKey: string,
        overwrite: boolean
    ): Promise<void> {
        await this.packageManagerFactory.createPushManager(spaceKey, fileName, newKey, overwrite).push();
    }

    public async pushPackages(spaceKey: string): Promise<void> {
        const packageManagers = this.packageManagerFactory.createPushManagers(spaceKey);
        await this.baseManagerHelper.batchPush(packageManagers);
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
