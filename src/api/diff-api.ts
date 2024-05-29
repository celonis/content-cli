import {PackageDiffTransport} from "../interfaces/diff-package.transport";
import {httpClientV2} from "../services/http-client-service.v2";
import * as FormData from "form-data";

class DiffApi {
    public static readonly INSTANCE = new DiffApi();

    public async diffPackages(data: FormData): Promise<PackageDiffTransport[]> {
        return httpClientV2.postFile(
            "/package-manager/api/core/packages/diff/configuration",
            data
        );
    }

    public async hasChanges(data: FormData): Promise<PackageDiffTransport[]> {
        return httpClientV2.postFile(
            "/package-manager/api/core/packages/diff/configuration/has-changes",
            data
        );
    }
}

export const diffApi = DiffApi.INSTANCE;