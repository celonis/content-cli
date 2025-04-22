import { Context } from "../../core/cli-context";
import { ListService } from "./list-service";

export class ListCommand {

    constructor(private context : Context) {}

    public async listPackages(jsonResponse: boolean, includeDependencies: boolean, packageKeys: string[]): Promise<void> {
        const listService = new ListService(this.context);
        if (jsonResponse) {
            await listService.findAndExportListOfAllPackages(includeDependencies, packageKeys ?? []);
        } else {
            await listService.listPackages();
        }
    }

}
