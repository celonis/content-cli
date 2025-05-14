import { QuestionService } from "./question.service";
import { ProfileService } from "../../core/profile/profile.service";
import { FatalError, logger } from "../../core/utils/logger";
import {Profile, ProfileType} from "../../core/profile/profile.interface";
import {ProfileValidator} from "../../core/profile/profile.validator";

export class ProfileCommandService {
    private profileService = new ProfileService();

    public async createProfile(setAsDefault: boolean): Promise<void> {
        const profile: Profile = {} as Profile;
        const questions = new QuestionService();
        try {
            profile.name = await questions.ask("Name of the profile: ");
            profile.team = await questions.ask("Your team (please provide the full url): ");
            const type = await questions.ask("Profile type: OAuth Device Code (1), OAuth Client Credentials (2) or Application Key / API Key (3): " );
            switch (type) {
                case "1":
                    profile.type = ProfileType.DEVICE_CODE;
                    break;
                case "2":
                    profile.type = ProfileType.CLIENT_CREDENTIALS;
                    profile.clientId = await questions.ask("Your client id: ");
                    profile.clientSecret = await questions.ask("Your client secret: ");
                    break;
                case "3":
                    profile.type = ProfileType.KEY;
                    profile.apiToken = await questions.ask("Your api token: ");
                    break;
                default:
                    logger.error(new FatalError("Invalid type"));
                    break;
            }
            profile.authenticationType = await ProfileValidator.validateProfile(profile);
            await this.profileService.authorizeProfile(profile);

            this.profileService.storeProfile(profile);
            if (setAsDefault) {
                await this.makeDefaultProfile(profile.name);
            }
        } finally {
            questions.close();
        }
        logger.info("Profile created successfully!");
    }

    public async listProfiles(): Promise<void> {
        this.profileService.readAllProfiles().then((profiles: string[]) => {
            const defaultProfile = this.profileService.getDefaultProfile();
            if (profiles) {
                profiles.forEach(profile => {
                    if (defaultProfile && defaultProfile === profile) {
                        logger.info(profile + " (default)");
                    } else {
                        logger.info(profile);
                    }
                });
            }
        });
    }

    public async makeDefaultProfile(profile: string): Promise<void> {
        await this.profileService.makeDefaultProfile(profile);
        logger.info("Default profile: " + profile);
    }
}
