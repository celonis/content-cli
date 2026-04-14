import { HttpClient } from "../../../core/http/http-client";
import { Context } from "../../../core/command/cli-context";
import { FatalError } from "../../../core/utils/logger";
import { PackageValidationRequest, SchemaValidationResponse } from "../interfaces/package-validation.interfaces";

export class PackageValidationApi {

    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async validatePackage(packageKey: string, request: PackageValidationRequest): Promise<SchemaValidationResponse> {
        return this.httpClient().post(
            `/pacman/api/core/packages/${packageKey}/validate`,
            request
        ).catch(e => {
            throw new FatalError(`Problem validating package "${packageKey}": ${e}`);
        });
    }
}
