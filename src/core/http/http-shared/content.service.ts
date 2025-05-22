import { BaseManager } from "./base.manager";

export class ContentService {

    public async pull(baseManager: BaseManager): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            baseManager.pull().then(
                () => resolve(),
                () => reject()
            );
        });
    }

    public async pullFile(baseManager: BaseManager): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            baseManager.pullFile().then(
                () => resolve(),
                () => reject()
            );
        });
    }

    public async push(baseManager: BaseManager): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            baseManager.push().then(
                () => resolve(),
                () => reject()
            );
        });
    }

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

    public async update(baseManager: BaseManager): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            baseManager.update().then(
                () => resolve(),
                () => reject()
            );
        });
    }

    public async findAll(baseManager: BaseManager): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            baseManager.findAll().then(
                () => resolve(),
                () => reject()
            );
        });
    }
}
