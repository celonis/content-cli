import {SpaceManager} from "../manager/space.manager";

export class SpaceManagerFactory {

    public createManager(): SpaceManager {
        return new SpaceManager();
    }

}
