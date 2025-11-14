import { Context } from "../../core/command/cli-context";
import { PackageVersionService } from "./package-version.service";

export class PackageVersionCommandService {

    private packageVersionService: PackageVersionService;

    constructor(context: Context) {
        this.packageVersionService = new PackageVersionService(context);
    }

    public async getPackageVersion(packageKey: string, version: string, jsonResponse: boolean): Promise<void> {
        await this.packageVersionService.findNode(packageKey, version, jsonResponse);
    }
}
