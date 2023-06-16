import {httpClientV2} from "../services/http-client-service.v2";
import {
    ContentNodeTransport, PackageHistoryTransport, PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {FatalError} from "../util/logger";


class PackageApi {
    public static readonly INSTANCE = new PackageApi();

    public async findAllPackages(): Promise<ContentNodeTransport[]> {
        return httpClientV2.get("/package-manager/api/packages").catch(e => {
            throw new FatalError(`Problem getting packages: ${e}`);
        });
    }

    public async findAllPackagesWithVariableAssignments(): Promise<PackageWithVariableAssignments[]> {
        return httpClientV2.get("/package-manager/api/packages/with-variable-assignments").catch(e => {
            throw new FatalError(`Problem getting variables of packages: : ${e}`);
        });
    }

    public async findLatestVersionById(nodeId: string): Promise<PackageHistoryTransport> {
        return httpClientV2.get(`/package-manager/api/packages/${nodeId}/latest-version`).catch(e => {
            throw new FatalError(`Problem getting latest version of package: ${e}`);
        });
    }

    public async pullPackage(key: string,
                             store?: boolean,
                             newKey?: string,
                             draft?: boolean): Promise<any> {
        return httpClientV2.getFileData(`/package-manager/api/packages/${key}/export?store=${store}&draft=${draft}${newKey ? `&newKey=${newKey}` : ""}`);
    }
}

export const packageApi = PackageApi.INSTANCE;
