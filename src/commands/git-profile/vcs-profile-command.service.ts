import { QuestionService } from "../../core/utils/question.service";
import { FatalError, logger } from "../../core/utils/logger";
import { VcsProfileService } from "../../core/vcs-profile/vcs-profile.service";
import { AuthenticationType, VcsProfile, VcsType } from "../../core/vcs-profile/vcs-profile.interface";

export class VcsProfileCommandService {
    private vcsProfileService = new VcsProfileService();

    public async createProfile(setAsDefault: boolean): Promise<void> {
        const profile: VcsProfile = {} as VcsProfile;
        const questions = new QuestionService();
        try {
            profile.name = await questions.ask("Name of the VCS profile to create: ");
            const vcsType = await questions.ask("Used Versioned Control System (options: git): ");
            switch (vcsType) {
                case "git":
                    profile.vcsType = VcsType.GIT;
                    break;
                default:
                    logger.error(new FatalError("Invalid type"));
                    break;
            }
            profile.username = await questions.ask("Your VCS username: ");
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

            this.vcsProfileService.storeProfile(profile);
            if (setAsDefault) {
                await this.makeDefaultProfile(profile.name);
            }
        } finally {
            await questions.close();
        }
        logger.info("VCS Profile created successfully!");
    }

    public async listProfiles(): Promise<void> {
        this.vcsProfileService.readAllProfiles().then((profiles: string[]) => {
            const defaultProfile = this.vcsProfileService.getDefaultProfile();
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
        await this.vcsProfileService.makeDefaultProfile(profile);
        logger.info("Default VCS profile: " + profile);
    }
}
