import { QuestionService } from "../services/question.service";
import { Profile } from "../interfaces/profile.interface";
import { ProfileService } from "../services/profile.service";
import { ProfileValidator } from "../validators/profile.validator";

export class ProfileCommand {
    public static async createProfile() {
        const profile: Profile = {} as Profile;
        profile.name = await QuestionService.ask("Name of the profile: ");
        profile.team = await QuestionService.ask("Your team (please provide the full url): ");
        profile.apiToken = await QuestionService.ask("Your api token: ");
        await ProfileValidator.validateProfile(profile);
        ProfileService.storeProfile(profile);
    }

    public static async listProfiles() {
        ProfileService.readAllProfiles().then((profiles: string[]) => {
            if (profiles) {
                profiles.forEach(profile => {
                    console.log(profile);
                });
            }
        });
    }
}
