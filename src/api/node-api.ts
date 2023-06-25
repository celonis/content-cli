import {ContentNodeTransport} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class NodeApi {
    public static readonly INSTANCE = new NodeApi();

    public async findAllNodesOfType(assetType?: string): Promise<ContentNodeTransport[]> {
        return httpClientV2.get(`/package-manager/api/nodes?assetType=${assetType}`)
            .catch(e=> {
                throw new FatalError(`Problem getting nodes of type ${assetType}: ${e}`);
            });
    }

    public async findAllByRootKey(rootKey: string): Promise<ContentNodeTransport[]> {
        return httpClientV2.get(`/package-manager/api/nodes/by-root-key/${rootKey}`)
            .catch(e=> {
                throw new FatalError(`Problem getting nodes for root key ${rootKey}: ${e}`);
            });
    }
}

export const nodeApi = NodeApi.INSTANCE;