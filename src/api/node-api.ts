import {ContentNodeTransport} from "../interfaces/package-manager.interfaces";
import {httpClientV2} from "../services/http-client-service.v2";
import {FatalError} from "../util/logger";

class NodeApi {
    public static readonly INSTANCE = new NodeApi();

    public async findAllNodesOfType(assetType?: string): Promise<ContentNodeTransport[]> {
        return httpClientV2.get(`/package-manager/api/nodes?assetType=${assetType}`)
            .catch(e => {
                throw new FatalError(`Problem getting nodes of type ${assetType}: ${e}`);
            });
    }

    public async findOneByKeyAndRootNodeKey(packageKey: string, nodeKey: string): Promise<ContentNodeTransport | null> {
        return httpClientV2.get(`/package-manager/api/nodes/${packageKey}/${nodeKey}`).catch(e => {
            return null;
        });
    }
}

export const nodeApi = NodeApi.INSTANCE;