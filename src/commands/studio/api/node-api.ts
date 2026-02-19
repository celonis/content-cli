import {ContentNodeTransport} from "../interfaces/package-manager.interfaces";
import {HttpClient} from "../../../core/http/http-client";
import {Context} from "../../../core/command/cli-context";
import {FatalError} from "../../../core/utils/logger";

export class NodeApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllNodesOfType(assetType?: string): Promise<ContentNodeTransport[]> {
        return this.httpClient()
            .get(`/package-manager/api/nodes?assetType=${assetType}`)
            .catch(e => {
                throw new FatalError(`Problem getting nodes of type ${assetType}: ${e}`);
            });
    }

    public async findOneByKeyAndRootNodeKey(packageKey: string, nodeKey: string): Promise<ContentNodeTransport | null> {
        return this.httpClient()
            .get(`/package-manager/api/nodes/${packageKey}/${nodeKey}`)
            .catch(e => {
                return null;
            });
    }
}
