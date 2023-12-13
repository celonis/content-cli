import { httpClientV2 } from "../services/http-client-service.v2";
import { FatalError } from "../util/logger";
import { DataPoolInstallVersionReport, DataPoolPageTransport } from "../interfaces/data-pool-manager.interfaces";

class DataPoolApi {
    public static readonly INSTANCE = new DataPoolApi();

    public async findAllPagedPools(limit: string, page: string): Promise<DataPoolPageTransport> {
        return httpClientV2.get(`/integration/api/pools/paged?limit=${limit}&page=${page}`).catch(e => {
            throw new FatalError(`Problem getting data pools: : ${e}`);
        });
    }

    public async executeDataPoolsBatchImport(importRequest: string): Promise<DataPoolInstallVersionReport> {
        return httpClientV2.post("/integration/api/pool/batch-import", importRequest).catch(e => {
            throw new FatalError(`Data Pool batch import failed: : ${e}`);
        });
    }

    public async exportDataPool(poolId: string): Promise<string> {
        return httpClientV2.get(`/integration/api/pools/${poolId}/v2/export`).catch(e => {
            throw new FatalError(`Data Pool export failed: : ${e}`);
        });
    }

    public async listConnections(poolId: string): Promise<any> {
        return httpClientV2.get(`/integration/api/pools/${poolId}/overviews/data-sources`).catch(e => {
            throw new FatalError(`Can not list connections: : ${e}`);
        });
    }

    public async getConnection(poolId: string, connectionId: string): Promise<any> {
        return httpClientV2.get(`/integration/api/pools/${poolId}/data-sources/${connectionId}`).catch(e => {
            throw new FatalError(`Can not get connection: : ${e}`);
        });
    }

    public async getTypedConnection(poolId: string, connectionId: string, type: string): Promise<any> {
        return httpClientV2.get(`/integration/api/datasource/${type}/${connectionId}`).catch(e => {
            throw new FatalError(`Can get typed connection: : ${e}`);
        });
    }

    public async updateTypedConnection(poolId: string, connectionId: string, type: string, data: any): Promise<any> {
        return httpClientV2.put(`/integration/api/datasource/${type}/${connectionId}`, data).catch(e => {
            throw new FatalError(`Can not update typed connection: ${e}`);
        });
    }
}

export const dataPoolApi = DataPoolApi.INSTANCE;
