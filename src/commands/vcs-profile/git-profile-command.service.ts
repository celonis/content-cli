import { QuestionService } from "../../core/utils/question.service";
import { FatalError, logger } from "../../core/utils/logger";
import { GitProfileService } from "../../core/git-profile/git-profile.service";
import { AuthenticationType, GitProfile } from "../../core/git-profile/git-profile.interface";

export class GitProfileCommandService {
    private gitProfileService = new GitProfileService();

    public async createProfile(setAsDefault: boolean): Promise<void> {
        const profile: GitProfile = {} as GitProfile;
        const questions = new QuestionService();
        try {
            profile.name = await questions.ask("Name of the Git profile to create: ");
            profile.username = await questions.ask("Your Git username: ");
            profile.repository = await questions.ask("Your repository (format: repoOwner/repoName): ");
            const type = await questions.ask("Authentication type: PAT (1), SSH token (2): " );
            switch (type) {
                case "1":
                    profile.authenticationType = AuthenticationType.PAT;
                    profile.token = await questions.ask("Your Personal Access Token (PAT): " );
                    break;
                case "2":
                    profile.authenticationType = AuthenticationType.SSH;
                    break;
                default:
                    logger.error(new FatalError("Invalid type"));
                    break;
            }
            // possibly check if the user has sent a valid token that has access in the repository

            this.gitProfileService.storeProfile(profile);
            if (setAsDefault) {
                await this.makeDefaultProfile(profile.name);
            }
        } finally {
            await questions.close();
        }
        logger.info("Git Profile created successfully!");
    }

    public async listProfiles(): Promise<void> {
        this.gitProfileService.readAllProfiles().then((profiles: string[]) => {
            const defaultProfile = this.gitProfileService.getDefaultProfile();
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
        await this.gitProfileService.makeDefaultProfile(profile);
        logger.info("Default Git profile: " + profile);
    }
}
