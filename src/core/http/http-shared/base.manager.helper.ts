import { BaseManager } from "./base.manager";

export class BaseManagerHelper {

    public async batchPush(baseManagers: BaseManager[]): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            const promises: Array<Promise<any>> = [];

            baseManagers.forEach(baseManager => {
                promises.push(baseManager.push());
            });

            Promise.all(promises).then(
                () => resolve(),
                () => reject()
            );
        });
    }
}
