import { Profile } from "../interfaces/profile.interface";
import { logger } from "../util/logger";

/**
 * The execution context object is passed to the modules to access
 * foundational services such as APIs, profiles, logging etc. It is
 * configured upon the start of the CLI.
 */

export class Context {
    log = logger;
    api = null; // TODO - provide access to an initialized API (http api etc.)
    profile: Profile;
}