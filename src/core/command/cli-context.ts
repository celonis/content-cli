import { HttpClient } from "../http/http-client";
import {ProfileService} from "../profile/profile.service";
import {logger} from "../utils/logger";
import {Profile} from "../profile/profile.interface";
import { GitProfile } from "../git-profile/git-profile.interface";
import { GitProfileService } from "../git-profile/git-profile.service";

/**
 * The execution context object is passed to the modules to access
 * foundational services such as APIs, profiles, logging etc. It is
 * configured upon the start of the CLI.
 */

export class Context {

    public httpClient: HttpClient;
    public profile: Profile;
    public gitProfile: GitProfile;

    private log = logger;
    private profileName: string | undefined;
    private gitProfileName: string | undefined;

    private profileService = new ProfileService();
    private gitProfileService = new GitProfileService();

    constructor(options: any) {
        this.profileName = options.profile;
        this.gitProfileName = options.gitProfile;
    }

    public async init(): Promise<void> {
        await this.loadProfile(this.profileName);
        await this.loadGitProfile(this.gitProfileName);

        if (this.profile) {
            // only if a profile is available, it makes sense to provide an initialized
            // HttpClient API.
            this.httpClient = new HttpClient(this);
        }
    }

    private async loadProfile(profileName: string | undefined): Promise<void> {
        if (!profileName) {
            this.log.debug("Profile name not specified, using default profile name");
            profileName = this.profileService.getDefaultProfile();
            if (!profileName) {
                this.log.debug("A default profile is not configured.");
            }
        }
        try {
            this.profile = await this.profileService.findProfile(profileName);
            this.profileName = profileName;
            this.log.debug(`Using profile ${profileName}`);
        } catch (err) {
            this.log.error(err);
            this.profile = undefined;
            this.profileName = undefined;
        }
    }

    private async loadGitProfile(gitProfileName: string | undefined): Promise<void> {
        if (!gitProfileName) {
            this.log.debug("Git Profile name not specified, using default profile");
            gitProfileName = this.gitProfileService.getDefaultProfile();
            if (!gitProfileName) {
                this.log.debug("A default Git profile is not configured.");
            }
        }
        try {
            this.gitProfile = await this.gitProfileService.findProfile(gitProfileName);
            this.gitProfileName = gitProfileName;
            this.log.debug(`Using git profile ${gitProfileName}`);
        } catch (err) {
            this.gitProfile = undefined;
            this.gitProfileName = undefined;
        }
    }

}