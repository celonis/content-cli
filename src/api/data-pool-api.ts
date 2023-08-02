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
}

export const dataPoolApi = DataPoolApi.INSTANCE;
