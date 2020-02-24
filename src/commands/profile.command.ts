import { QuestionService } from "../services/question.service";
import { Profile } from "../interfaces/profile.interface";
import { ProfileService } from "../services/profile.service";
import { ProfileValidator } from "../validators/profile.validator";
import { logger } from "../util/logger";

export class ProfileCommand {
    private profileService = new ProfileService();

    public async createProfile(setAsDefault: boolean) {
        const profile: Profile = {} as Profile;
        profile.name = await QuestionService.ask("Name of the profile: ");
        profile.team = await QuestionService.ask("Your team (please provide the full url): ");
        profile.apiToken = await QuestionService.ask("Your api token: ");
        await ProfileValidator.validateProfile(profile);
        this.profileService.storeProfile(profile);
        if (setAsDefault) {
            await this.makeDefaultProfile(profile.name);
        }
        logger.info("Profile created successfully!");
    }

    public async listProfiles() {
        this.profileService.readAllProfiles().then((profiles: string[]) => {
            const defaultProfile = this.profileService.getDefaultProfile();
            if (profiles) {
                profiles.forEach(profile => {
                    if (defaultProfile && defaultProfile === profile) {
                        console.log(profile + " (default)");
                    } else {
                        console.log(profile);
                    }
                });
            }
        });
    }

    public async makeDefaultProfile(profile: string) {
        await this.profileService.makeDefaultProfile(profile);
        logger.info("Default profile: " + profile);
    }
}
