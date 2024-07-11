import { httpClientV2 } from "../services/http-client-service.v2";
import { FatalError } from "../util/logger";
import * as FormData from "form-data";

class ActionFlowApi {
    public static readonly INSTANCE = new ActionFlowApi();

    public async exportRawAssets(packageId: string): Promise<Buffer> {
        return httpClientV2.getFile(`/ems-automation/api/root/${packageId}/export/assets`).catch(e => {
            throw new FatalError(`Problem getting Action Flow assets: ${e}`);
        });
    }

    public async analyzeAssets(packageId: string): Promise<any> {
        return httpClientV2.get(`/ems-automation/api/root/${packageId}/export/assets/analyze`).catch(e => {
            throw new FatalError(`Problem analyzing Action Flow assets: ${e}`);
        });
    }

    public async importAssets(packageId: string, data: FormData, dryRun: boolean): Promise<any> {
        const params = {
            dryRun: dryRun,
        };

        return httpClientV2.postFile(`/ems-automation/api/root/${packageId}/import/assets`, data, params).catch(e => {
            throw new FatalError(`Problem importing Action Flow assets: ${e}`);
        });
    }
}

export const actionFlowApi = ActionFlowApi.INSTANCE;