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
    log = logger;
    httpClient: HttpClient; // TODO - provide access to an initialized API (http api etc.)
    profile: Profile;
    profileName: string | undefined;

    private profileService = new ProfileService();

    constructor(options: any) {
        this.profileName = options.profile;
    }

    async init() {
        await this.loadProfile(this.profileName);

        if (this.profile) {
            // only if a profile is available, it makes sense to provide an initialized
            // HttpClient API. 
            this.httpClient = new HttpClient(this);
        }
    }

    async loadProfile(profileName: string | undefined) {
        if (!profileName) {
            this.log.debug(`Profile name not specified, using default profile name`);
            profileName = this.profileService.getDefaultProfile();
            if (!profileName) {
                this.log.debug(`A default profile is not configured.`);
            }
        } 
        if (profileName) {
            try {
                this.profile = await this.profileService.findProfile(profileName);
                this.profileName = profileName;
                this.log.info(`Using profile ${profileName}`);
            } catch (err) {
                // TODO - The error message is incorrect, overriding it here for the time being. 
                // change it though after the ProfileService is completely migrated/fixed.
                //this.log.error(err);
                this.log.error(`The profile ${profileName} cannot be loaded.`);
                this.profile = undefined;
                this.profileName = undefined;
            }
        }
    }

}