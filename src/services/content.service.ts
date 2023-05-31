import { ProfileService } from "./profile.service";
import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
import { BaseManager } from "../content/manager/base.manager";

export class ContentService {
    private profileService = new ProfileService();

    public async pull(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.pull().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async pullFile(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.pullFile().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async push(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.push().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async batchPush(profileName: string, baseManagers: BaseManager[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    const promises: Array<Promise<any>> = [];

                    baseManagers.forEach(baseManager => {
                        baseManager.profile = profile;
                        promises.push(baseManager.push());
                    });

                    Promise.all(promises).then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async update(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.update().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async findAll(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.findAll().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public async   findAllAndExport(profileName: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profileName))
                .then((profile: Profile) => {
                    baseManager.profile = profile;
                    baseManager.findAllAndExport().then(
                        () => resolve(),
                        () => reject()
                    );
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    private resolveProfile(profile: string): string {
        if (profile) {
            return profile;
        }

        return this.profileService.getDefaultProfile();
    }
}
