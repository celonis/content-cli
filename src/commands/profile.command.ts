import { QuestionService } from "../services/question.service";
import { Profile } from "../interfaces/profile.interface";
import { ProfileService } from "../services/profile.service";
import { ProfileValidator } from "../validators/profile.validator";
import { FatalError, logger } from "../util/logger";

export class ProfileCommand {
    private profileService = new ProfileService();

    public async createProfile(setAsDefault: boolean): Promise<void> {
        const profile: Profile = {} as Profile;
        profile.name = await QuestionService.ask("Name of the profile: ");
        profile.team = await QuestionService.ask("Your team (please provide the full url): ");
        const type = await QuestionService.ask("Profile type: OAuth Device Code (1) or Application Key / API Key (2): " );
        switch (type) {
            case "1":
                profile.type = "Device Code";
                break;
            case "2":
                profile.type = "Key";
                profile.apiToken = await QuestionService.ask("Your api token: ");
                break;
            default:
                logger.error(new FatalError("Invalid choice"));
                break;
        }
        profile.authenticationType = await ProfileValidator.validateProfile(profile);
        await this.profileService.authorizeProfile(profile);

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
