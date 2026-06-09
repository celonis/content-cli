import { Context } from "../../core/command/cli-context";
import { VariableService } from "./variable.service";

export class ConfigCommandService {

    private variableService: VariableService;

    constructor(context: Context) {
        this.variableService = new VariableService(context);
    }

    public async listVariables(
        jsonResponse: boolean,
        keysByVersion: string[],
        keysByVersionFile: string,
        packageKeys: string[]
    ): Promise<void> {
        if (packageKeys.length > 0) {
            if (jsonResponse) {
                await this.variableService.exportStagingVariables(packageKeys);
            } else {
                await this.variableService.listStagingVariables(packageKeys);
            }
        } else if (jsonResponse) {
            await this.variableService.exportVariables(keysByVersion, keysByVersionFile);
        } else {
            await this.variableService.listVariables(keysByVersion, keysByVersionFile);
        }
    }
}
