import { SpaceManager } from "./space.manager";
import { Context } from "../../../core/command/cli-context";

export class SpaceManagerFactory {

    private readonly context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    public createListManager(jsonResponse: boolean): SpaceManager {
        return this.createManager(jsonResponse);
    }

    public createManager(jsonResponse?: boolean): SpaceManager {
        const spaceManager = new SpaceManager(this.context);
        spaceManager.jsonResponse = jsonResponse;
        return spaceManager;
    }
}