import { HttpClient } from "../http/http-client";
import {ProfileService} from "../profile/profile.service";
import {FatalError, logger} from "../utils/logger";
import {Profile} from "../profile/profile.interface";
import { VcsProfileService } from "../vcs-profile/vcs-profile.service";
import { VcsProfile } from "../vcs-profile/vcs-profile.interface";

/**
 * The execution context object is passed to the modules to access
 * foundational services such as APIs, profiles, logging etc. It is
 * configured upon the start of the CLI.
 */

export class Context {

    public _httpClient: HttpClient;
    public profile: Profile;
    public vcsProfile: VcsProfile;

    private log = logger;
    private profileName: string | undefined;
    private vcsProfileName: string | undefined;

    private profileService = new ProfileService();
    private vcsProfileService = new VcsProfileService();

    constructor(options: any) {
        this.profileName = options.profile;
        this.vcsProfileName = options.vcsProfile;
    }

    public get httpClient(): HttpClient {
        if (!this._httpClient) {
            throw new FatalError("No profile provided. Please provide a profile or a TEAM_URL and API_TOKEN through env variables");
        }
        return this._httpClient;
    }

    public async init(): Promise<void> {
        await this.loadProfile(this.profileName);
        await this.loadVcsProfile(this.vcsProfileName);

        if (this.profile) {
            // only if a profile is available, it makes sense to provide an initialized
            // HttpClient API.
            this._httpClient = new HttpClient(this);
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
            this.log.debug(err);
            this.profile = undefined;
            this.profileName = undefined;
        }
    }

    private async loadVcsProfile(gitProfileName: string | undefined): Promise<void> {
        if (!gitProfileName) {
            this.log.debug("VCS Profile name not specified, using default profile");
            gitProfileName = this.vcsProfileService.getDefaultProfile();
            if (!gitProfileName) {
                this.log.debug("A default VCS profile is not configured.");
            }
        }
        try {
            this.vcsProfile = await this.vcsProfileService.findProfile(gitProfileName);
            this.vcsProfileName = gitProfileName;
            this.log.debug(`Using VCS profile ${gitProfileName}`);
        } catch (err) {
            this.vcsProfile = undefined;
            this.vcsProfileName = undefined;
        }
    }

}