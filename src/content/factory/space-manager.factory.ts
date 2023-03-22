import {SpaceManager} from "../manager/space.manager";

export class SpaceManagerFactory {

    public createManager(
        id?: string,
        name?: string,
    ): SpaceManager {
        const spaceManager = new SpaceManager();

        spaceManager.id = id;
        spaceManager.name = name;

        return spaceManager;
    }

}
