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
    }

}