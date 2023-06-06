import {Profile} from "../interfaces/profile.interface";
import {profileService} from "./profile.service";

interface Context {
    profile: Profile;
}

class ContextService {
    public static readonly INSTANCE = new ContextService();
    private context: Context;

    public getContext(): Context {
        return this.context;
    }

    public async resolveProfile(profile: string): Promise<void> {
        const resolvedProfile = await profileService.findProfile(profile);
        this.setContext({profile: resolvedProfile});
    };

    public setContext(context: Context): void {
        this.context = context;
    }
}

export const contextService = ContextService.INSTANCE;
