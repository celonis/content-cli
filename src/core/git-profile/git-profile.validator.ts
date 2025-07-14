import { AuthenticationType, GitProfile } from "./git-profile.interface";
import { FatalError, logger } from "../utils/logger";

export class ProfileValidator {
    public static async validateProfile(gitProfile: GitProfile): Promise<any> {
        if (gitProfile.name == null) {
            logger.error(new FatalError("The name can not be empty"));
        }
        if (gitProfile.username == null) {
            logger.error(new FatalError("The username can not be empty"));
        }
        if (gitProfile.repository == null) {
            logger.error(new FatalError("The repository can not be empty"));
        }
        if (gitProfile.authenticationType == null) {
            logger.error(new FatalError("The authentication type can not be empty"));
        }
        if (gitProfile.authenticationType === AuthenticationType.PAT && gitProfile.token == null) {
            logger.error(new FatalError("The token can not be empty for authentication with PAT"));
        }
    }
}
