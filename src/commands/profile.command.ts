import { QuestionService } from "../services/question.service";
import { Profile } from "../interfaces/profile.interface";
import { ProfileService } from "../services/profile.service";
import { ProfileValidator } from "../validators/profile.validator";
import { logger } from "../util/logger";

export class ProfileCommand {
    private profileService = new ProfileService();

    public async createProfile(setAsDefault: boolean): Promise<void> {
        const profile: Profile = {} as Profile;
        profile.name = await QuestionService.ask("Name of the profile: ");
        profile.team = await QuestionService.ask("Your team (please provide the full url): ");
        const type = await QuestionService.ask("Profile type: OAuth (1) or Key-based (2):" );
        if (type === "1") {
            profile.type = "OAuth";
            profile.clientId = await QuestionService.ask("Your OAuth client id: ");
            profile.clientSecret = await QuestionService.ask("Your OAuth client secret: ");
        }
        else {
            profile.type = "Key";
            profile.apiToken = await QuestionService.ask("Your api token: ");
        }
        profile.authenticationType = await ProfileValidator.validateProfile(profile);
        this.profileService.storeProfile(profile);
        if (setAsDefault) {
            await this.makeDefaultProfile(profile.name);
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
