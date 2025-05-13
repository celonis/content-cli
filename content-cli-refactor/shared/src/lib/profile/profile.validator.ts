import validUrl from "valid-url";
import {Profile, ProfileType} from "./profile.interfaces";
import {FatalError} from "../logger.service";
import {logger} from "nx/src/utils/logger";

export class ProfileValidator {
    public static async validateProfile(profile: Profile): Promise<any> {
        if (profile.name == null) {
            logger.error(new FatalError("The name can not be empty"));
        }
        if (profile.team == null) {
            logger.error(new FatalError("The team can not be empty"));
        }
        if (profile.type === ProfileType.KEY && profile.apiToken == null) {
            logger.error(new FatalError("The api token can not be empty for this profile type"));
        }
        if (profile.type === ProfileType.CLIENT_CREDENTIALS && (profile.clientId == null || profile.clientSecret == null)) {
            logger.error(new FatalError("The client id and secret can not be empty for this profile type"));
        }
        if (!validUrl.isUri(profile.team)) {
            logger.error(new FatalError("The provided url is not a valid url."));
        }
    }
}
