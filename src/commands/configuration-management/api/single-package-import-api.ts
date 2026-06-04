import * as FormData from "form-data";
import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { SinglePackageImportResult } from "../interfaces/single-package-import.interfaces";

export class SinglePackageImportApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async importPackage(data: FormData, overwrite: boolean): Promise<SinglePackageImportResult> {
        return this.httpClient().postFile(
            "/pacman/api/core/staging/packages/import-file",
            data,
            { overwrite }
        );
    }
}
