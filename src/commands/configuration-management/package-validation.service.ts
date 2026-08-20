import { v4 as uuidv4 } from "uuid";
import { Context } from "../../core/command/cli-context";
import { PackageValidationApi } from "./api/package-validation-api";
import { PackageValidationRequest, SchemaValidationResponse, SchemaValidationResult } from "./interfaces/package-validation.interfaces";
import { logger } from "../../core/utils/logger";
import { CuiFileService } from "../../core/utils/cui-file-service";

export class PackageValidationService {

    private packageValidationApi: PackageValidationApi;
    private readonly cuiFileService: CuiFileService;

    constructor(context: Context) {
        this.packageValidationApi = new PackageValidationApi(context);
        this.cuiFileService = new CuiFileService(context);
    }

    public async validatePackage(packageKey: string, layers: string[], nodeKeys: string[], jsonOutput: boolean): Promise<void> {
        const request: PackageValidationRequest = {};
        // Omitted rather than defaulted here: the API reads an absent "layers" as every layer available for
        // the team, and rejects an empty list.
        if (layers && layers.length > 0) {
            request.layers = layers;
        }
        if (nodeKeys && nodeKeys.length > 0) {
            request.nodeKeys = nodeKeys;
        }

        const response = await this.packageValidationApi.validatePackage(packageKey, request);

        if (jsonOutput) {
            const reportFileName = "config_validate_report_" + uuidv4() + ".json";
            const writtenFileName = await this.cuiFileService.writeToFileWithGivenName(JSON.stringify(response), reportFileName);
            logger.info("Validation report file: " + writtenFileName);
        } else {
            this.printValidationResult(response);
        }
    }

    private printValidationResult(response: SchemaValidationResponse): void {
        const status = response.valid ? "VALID" : "INVALID";
        logger.info("");
        logger.info(`Validation result: ${status}`);
        logger.info(`Errors: ${response.summary.errors} | Warnings: ${response.summary.warnings} | Info: ${response.summary.info}`);

        if (response.results.length > 0) {
            logger.info("");
            response.results.forEach((result: SchemaValidationResult) => {
                const prefix = result.severity.toUpperCase().padEnd(7);
                logger.info(`  ${prefix} ${result.nodeKey} (${result.assetType}) - ${result.message} [${result.code}]`);
            });
        }
    }
}
