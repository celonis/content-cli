import {DataPoolInstallVersionReport, DataPoolPageTransport} from "./data-pool-manager.interfaces";
import {FatalError} from "../../../core/utils/logger";
import {Context} from "../../../core/command/cli-context";
import {HttpClient} from "../../../core/http/http-client";

export class DataPoolApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async findAllPagedPools(limit: string, page: string): Promise<DataPoolPageTransport> {
        return this.httpClient()
            .get(`/integration/api/pools/paged?limit=${limit}&page=${page}`)
            .catch(e => {
                throw new FatalError(`Problem getting data pools: : ${e}`);
            });
    }

    public async executeDataPoolsBatchImport(importRequest: string): Promise<DataPoolInstallVersionReport> {
        return this.httpClient()
            .post("/integration/api/pool/batch-import", importRequest)
            .catch(e => {
                throw new FatalError(`Data Pool batch import failed: : ${e}`);
            });
    }

    public async exportDataPool(poolId: string): Promise<string> {
        return this.httpClient()
            .get(`/integration/api/pools/${poolId}/v2/export`)
            .catch(e => {
                throw new FatalError(`Data Pool export failed: : ${e}`);
            });
    }

    public async listConnections(poolId: string): Promise<any> {
        return this.httpClient()
            .get(`/integration/api/pools/${poolId}/overviews/data-sources`)
            .catch(e => {
                throw new FatalError(`Can not list connections: : ${e}`);
            });
    }

    public async getConnection(poolId: string, connectionId: string): Promise<any> {
        return this.httpClient()
            .get(`/integration/api/pools/${poolId}/data-sources/${connectionId}`)
            .catch(e => {
                throw new FatalError(`Can not get connection: : ${e}`);
            });
    }

    public async getTypedConnection(poolId: string, connectionId: string, type: string): Promise<any> {
        return this.httpClient()
            .get(`/integration/api/datasource/${type}/${connectionId}`)
            .catch(e => {
                throw new FatalError(`Can get typed connection: : ${e}`);
            });
    }

    public async updateTypedConnection(poolId: string, connectionId: string, type: string, data: any): Promise<any> {
        return this.httpClient()
            .put(`/integration/api/datasource/${type}/${connectionId}`, data)
            .catch(e => {
                throw new FatalError(`Can not update typed connection: ${e}`);
            });
    }
}
