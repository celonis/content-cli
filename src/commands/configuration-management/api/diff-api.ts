import * as FormData from "form-data";
import {HttpClient} from "../../../core/http/http-client";
import {Context} from "../../../core/command/cli-context";
import {PackageDiffMetadata, PackageDiffTransport} from "../interfaces/diff-package.interfaces";

export class DiffApi {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async diffPackages(data: FormData): Promise<PackageDiffTransport[]> {
        return this.httpClient().postFile("/package-manager/api/core/packages/diff/configuration", data);
    }

    public async hasChanges(data: FormData): Promise<PackageDiffMetadata[]> {
        return this.httpClient().postFile("/package-manager/api/core/packages/diff/configuration/has-changes", data);
    }
}
