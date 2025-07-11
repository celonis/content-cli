import { HttpClient } from "../http/http-client";
import {ProfileService} from "../profile/profile.service";
import {FatalError, logger} from "../utils/logger";
import {Profile} from "../profile/profile.interface";

/**
 * The execution context object is passed to the modules to access
 * foundational services such as APIs, profiles, logging etc. It is
 * configured upon the start of the CLI.
 */

export class Context {

    public _httpClient: HttpClient;
    public profile: Profile;

    private log = logger;
    private profileName: string | undefined;

    private profileService = new ProfileService();

    constructor(options: any) {
        this.profileName = options.profile;
    }

    public get httpClient(): HttpClient {
        if (!this._httpClient) {
            throw new FatalError("No profile provided. Please provide a profile or an TEAM_URL and API_TOKEN through env variables");
        }
        return this._httpClient;
    }

    public async init(): Promise<void> {
        await this.loadProfile(this.profileName);

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

}