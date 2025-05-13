import {Profile} from "./profile.interfaces";
import {Injectable} from "@nestjs/common";
import {ProfileService} from "./profile.service";

interface Context {
    profile: Profile;
}

@Injectable()
export class ContextService {

    private context: Context;
    private profileService: ProfileService;

    constructor(context: Context, profileService: ProfileService) {
        this.context = context;
        this.profileService = profileService;
    }

    public getContext(): Context {
        return this.context;
    }

    public async resolveProfile(profile: string): Promise<void> {
        const resolvedProfile = await this.profileService.findProfile(profile);
        this.setContext({profile: resolvedProfile});
    };

    public setContext(context: Context): void {
        this.context = context;
    }
}
