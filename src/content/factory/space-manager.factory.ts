import {SpaceManager} from "../manager/space.manager";

export class SpaceManagerFactory {

    public createListManager(jsonResponse: boolean): SpaceManager {
        return this.createManager(jsonResponse);
    }

    public createManager(
        jsonResponse?: boolean
    ): SpaceManager {
        const spaceManager = new SpaceManager();
        spaceManager.jsonResponse = jsonResponse;
        return spaceManager;
    }
}