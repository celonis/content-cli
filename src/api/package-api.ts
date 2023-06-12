import {httpClientV2} from "../services/http-client-service.v2";
import {
    ContentNodeTransport, PackageHistoryTransport, PackageWithVariableAssignments
} from "../interfaces/package-manager.interfaces";
import {FatalError} from "../util/logger";


class PackageApi {
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

}

export const packageApi = new PackageApi();
