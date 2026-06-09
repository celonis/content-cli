import * as FormData from "form-data";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { PackageDiffMetadata, PackageDiffTransport } from "../../configuration-management/interfaces/diff-package.interfaces";

export class DiffApi {

    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async diffPackages(baseVersion: string, data: FormData): Promise<PackageDiffTransport[]> {
        const paramString = baseVersion ? "?" + new URLSearchParams({"baseVersion": baseVersion}).toString() : "";
        return this.httpClient().postFile(
            `/package-manager/api/core/packages/diff/configuration${paramString}`,
            data
        );
    }

    public async hasChanges(baseVersion: string, data: FormData): Promise<PackageDiffMetadata[]> {
        const paramString = baseVersion ? "?" + new URLSearchParams({"baseVersion": baseVersion}).toString() : "";
        return this.httpClient().postFile(
            `/package-manager/api/core/packages/diff/configuration/has-changes${paramString}`,
            data
        );
    }
}
