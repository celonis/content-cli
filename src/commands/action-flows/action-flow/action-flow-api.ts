import * as FormData from "form-data";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";

export class ActionFlowApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async exportRawAssets(packageId: string): Promise<Buffer> {
        return this.httpClient().getFile(`/ems-automation/api/root/${packageId}/export/assets`).catch(e => {
            throw new FatalError(`Problem getting Action Flow assets: ${e}`);
        });
    }

    public async analyzeAssets(packageId: string): Promise<any> {
        return this.httpClient().get(`/ems-automation/api/root/${packageId}/export/assets/analyze`).catch(e => {
            throw new FatalError(`Problem analyzing Action Flow assets: ${e}`);
        });
    }

    public async importAssets(packageId: string, data: FormData, dryRun: boolean): Promise<any> {
        const params = {
            dryRun: dryRun,
        };

        return this.httpClient().postFile(`/ems-automation/api/root/${packageId}/import/assets`, data, params).catch(e => {
            throw new FatalError(`Problem importing Action Flow assets: ${e}`);
        });
    }
}
