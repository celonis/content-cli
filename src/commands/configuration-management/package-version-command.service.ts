import { Context } from "../../core/command/cli-context";
import { PackageVersionService } from "./package-version.service";

export class PackageVersionCommandService {

    private packageVersionService: PackageVersionService;

    constructor(context: Context) {
        this.packageVersionService = new PackageVersionService(context);
    }

    public async getPackageVersion(packageKey: string, version: string, jsonResponse: boolean): Promise<void> {
        await this.packageVersionService.findPackageVersion(packageKey, version, jsonResponse);
    }

    public async createPackageVersion(
        packageKey: string,
        version: string | undefined,
        versionBumpOption: string,
        summaryOfChanges: string | undefined,
        nodeFilterKeys: string[] | undefined,
        jsonResponse: boolean,
    ): Promise<void> {
        await this.packageVersionService.createPackageVersion(packageKey, version, versionBumpOption, summaryOfChanges, nodeFilterKeys, jsonResponse);
    }
}
