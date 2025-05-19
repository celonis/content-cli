import { HttpClient } from "../http/http-client";
import {ProfileService} from "../profile/profile.service";
import {logger} from "../utils/logger";
import {Profile} from "../profile/profile.interface";

/**
 * The execution context object is passed to the modules to access
 * foundational services such as APIs, profiles, logging etc. It is
 * configured upon the start of the CLI.
 */

export class Context {

    public httpClient: HttpClient;
    public profile: Profile;

    private log = logger;
    private profileName: string | undefined;

    private profileService = new ProfileService();

    constructor(options: any) {
        this.profileName = options.profile;
    }

    public async init(): Promise<void> {
        await this.loadProfile(this.profileName);

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
            this.log.info(`Using profile ${profileName}`);
        } catch (err) {
            this.log.error(err);
            this.profile = undefined;
            this.profileName = undefined;
        }
    }

}