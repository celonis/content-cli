import {BaseManager} from "./base.manager";

export class BaseManagerHelper {
    public async batchPush(baseManagers: BaseManager[]): Promise<any> {
        return Promise.all(baseManagers.map(baseManager => baseManager.push()));
    }
}
