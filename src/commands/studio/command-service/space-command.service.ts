import { SpaceManagerFactory } from "../manager/space.manager-factory";
import { Context } from "../../../core/command/cli-context";

export class SpaceCommandService {
    private spaceManagerFactory: SpaceManagerFactory;

    constructor(context: Context) {
        this.spaceManagerFactory = new SpaceManagerFactory(context);
    }

    public async listSpaces(jsonResponse: boolean): Promise<void> {
        await this.spaceManagerFactory.createListManager(jsonResponse).findAll();
    }
}
