import {Injectable} from "@nestjs/common";
import {PackageExportTransport} from "./package-export.transport";
import {HttpClientService} from "@content-cli-refactor/shared";


@Injectable()
export class BatchImportExportApi {

    private httpClientService: HttpClientService;

    constructor(httpClientService: HttpClientService) {
        this.httpClientService = httpClientService;
    }

    public findAllActivePackages(flavors: string[], withDependencies: boolean = false): Promise<PackageExportTransport[]> {
        const queryParams = new URLSearchParams();

        queryParams.set("withDependencies", withDependencies.toString());
        flavors.forEach(flavor => queryParams.append("flavors", flavor))

        return this.httpClientService.get(`/package-manager/api/core/packages/export/list?${queryParams.toString()}`).catch(e => {
            throw new Error(`Problem getting active packages: ${e}`);
        });
    }
}
