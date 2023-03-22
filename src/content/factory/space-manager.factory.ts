import {SpaceManager} from "../manager/space.manager";

export class SpaceManagerFactory {

    public createManager(
        id?: string,
        name?: string,
        iconReference?: string
    ): SpaceManager {
        const spaceManager = new SpaceManager();

        spaceManager.id = id;
        spaceManager.name = name;
        spaceManager.iconReference = iconReference;

        return spaceManager;
    }

}
