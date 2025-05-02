import { ForbiddenError } from "../../../core/base-api";
import { Context } from "../../../core/cli-context";
import { logger } from "../../../util/logger";
import { ConfigServiceApi } from "../api/config-service-api";


export class ConfigListCommand {

    api: ConfigServiceApi;

    constructor(private context: Context) {
        this.api = new ConfigServiceApi(context);
    }

    async execute(jsonResponse: boolean, flavors: string[], withDependencies: boolean, packageKeys:string[]): Promise<void> {

        flavors = flavors ?? [];
        
        try {
    
            if (jsonResponse) {
                //await batchImportExportService.findAndExportListOfActivePackages(flavors ?? [], packageKeys ?? [], withDependencies)
            } else {
                logger.info(`List of active packages:`);
                const activePackages = await this.api.findAllActivePackages(flavors);
                activePackages.forEach(pkg => {
                    logger.info(`${pkg.name} - Key: "${pkg.key}"`)
                });
                logger.info(`${activePackages.length} package(s) found.`);
            }

        } catch (error) {
            // handle the error in a nice way....
            if (error instanceof ForbiddenError) {
                logger.error(`You do not have the rights to perform this operation. Notice that you need a personal API key for 'config' operations.`);
            } else {
                throw error;
            }
        }
    }

}