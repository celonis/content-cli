import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
import validUrl = require("valid-url");

export class ProfileValidator {
    public static async validateProfile(profile: Profile): Promise<any> {
        if (profile.name == null) {
            logger.error(new FatalError("The name can not be empty"));
        }
        if (profile.team == null) {
            logger.error(new FatalError("The team can not be empty"));
        }
        if (profile.type === "Key" && profile.apiToken == null) {
            logger.error(new FatalError("The api token can not be empty for this profile type"));
        }
        if (!validUrl.isUri(profile.team)) {
            logger.error(new FatalError("The provided url is not a valid url."));
        }
    }
}
