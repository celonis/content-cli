import {SpaceManager} from "../manager/space.manager";

export class SpaceManagerFactory {

    public createListManager(responseType: string): SpaceManager {
        return this.createManager(responseType);
    }

    public createManager(
        responseType?: string
    ): SpaceManager {
        const spaceManager = new SpaceManager();
        spaceManager.responseType = responseType;
        return spaceManager;
    }
}