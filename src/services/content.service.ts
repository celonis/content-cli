import { ProfileService } from "./profile.service";
import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
import { BaseManager } from "../content/manager/base.manager";

export class ContentService {
    private profileService = new ProfileService();

    public async pull(profile: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profile))
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

    public async push(profile: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profile))
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

    public async update(profile: string, baseManager: BaseManager): Promise<any> {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(this.resolveProfile(profile))
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

    private resolveProfile(profile: string): string {
        if (profile) {
            return profile;
        }
        const defaultProfile = this.profileService.getDefaultProfile();
        if (defaultProfile) {
            return defaultProfile;
        }
        logger.error(new FatalError("No profile provided and no default profile set."));
    }
}
