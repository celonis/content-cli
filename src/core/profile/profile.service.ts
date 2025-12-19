import {
    AuthenticationType, ClientAuthenticationMethod,
    Profile, ProfileType
} from "./profile.interface";
import { ProfileValidator } from "./profile.validator";
import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../utils/logger";
import { Issuer } from "openid-client";
import axios from "axios";
import os = require("os");

const homedir = os.homedir();
// use 5 seconds buffer to avoid rare cases when accessToken is just about to expire before the command is sent
const expiryBuffer = 5000;
const deviceCodeScopes = ["studio", "package-manager", "integration.data-pools", "action-engine.projects"];
const clientCredentialsScopes = ["studio", "integration.data-pools", "action-engine.projects", "package-manager"];

export interface Config {
    defaultProfile: string;
}

export class ProfileService {
    private profileContainerPath = path.resolve(homedir, ".celonis-content-cli-profiles");
    private configContainer = path.resolve(this.profileContainerPath, "config.json");

    public async findProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            try {
                if (!this.checkIfMissingProfile(profileName)) {
                    const file = fs.readFileSync(
                        path.resolve(this.profileContainerPath, this.constructProfileFileName(profileName)),
                        { encoding: "utf-8" }
                    );
                    const profile : Profile = JSON.parse(file);
                    this.refreshProfile(profile)
                        .then(() => resolve(profile));
                } else if (process.env.TEAM_URL && process.env.API_TOKEN) {
                    resolve(this.buildProfileFromEnvVariables());
                } else if (process.env.CELONIS_URL && process.env.CELONIS_API_TOKEN) {
                    this.mapCelonisEnvProfile();
                    resolve(this.buildProfileFromEnvVariables());
                } else {
                    reject(`The profile ${profileName} couldn't be resolved due to missing environment variables.`);
                }
            } catch (e) {
                reject(`The profile ${profileName} couldn't be resolved.`);
            }
        });
    }

    public async makeDefaultProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            this.findProfile(profileName)
                .then((profile: Profile) => {
                    this.createProfileContainerIfNotExists();
                    this.storeConfig({ defaultProfile: profileName });
                    resolve(profile);
                })
                .catch(err => {
                    logger.error(new FatalError("Profile does not exit."));
                    reject(err);
                });
        });
    }

    public getDefaultProfile(): string {
        if (fs.existsSync(this.configContainer)) {
            const config = JSON.parse(fs.readFileSync(this.configContainer, { encoding: "utf-8" })) as Config;
            return config.defaultProfile;
        } else {
            return null;
        }
    }

    public storeProfile(profile: Profile): void {
        this.createProfileContainerIfNotExists();
        const newProfileFileName = this.constructProfileFileName(profile.name);
        profile.team = this.getBaseTeamUrl(profile.team);
        fs.writeFileSync(path.resolve(this.profileContainerPath, newProfileFileName), JSON.stringify(profile), {
            encoding: "utf-8",
        });
    }

    private async buildProfileFromEnvVariables(): Promise<Profile> {
        const profileVariables = this.getProfileEnvVariables();
        const profile: Profile = {
            name: profileVariables.teamUrl,
            team: profileVariables.teamUrl,
            apiToken: profileVariables.apiToken,
            authenticationType: AuthenticationType.BEARER,
            type: ProfileType.KEY
        };
        profile.authenticationType = await ProfileValidator.validateProfile(profile);
        return profile;
    }

    private storeConfig(config: Config): void {
        fs.writeFileSync(this.configContainer, JSON.stringify(config), { encoding: "utf-8" });
    }

    private createProfileContainerIfNotExists(): void {
        if (!fs.existsSync(this.profileContainerPath)) {
            fs.mkdirSync(this.profileContainerPath);
        }
    }

    private constructProfileFileName(profileName: string): string {
        return profileName + ".json";
    }

    public readAllProfiles(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const profiles = this.getAllFilesInDirectory();
            resolve(profiles);
        });
    }

    public getAllFilesInDirectory(): string[] {
        let fileNames: string[] = [];
        try {
            if (fs.existsSync(this.profileContainerPath)) {
                fileNames = fs
                    // @ts-ignore
                    .readdirSync(this.profileContainerPath, { withFileTypes: true })
                    .filter(
                        dirent =>
                            !dirent.isDirectory() && dirent.name.endsWith(".json") && dirent.name !== "config.json"
                    )
                    .map(dirent => dirent.name.replace(".json", ""));
            }
        } catch (err) {
            logger.error(new FatalError(err));
        }
        return fileNames;
    }

    public async authorizeProfile(profile: Profile) : Promise<void> {
        switch (profile.type) {
            case ProfileType.KEY:
                const url = profile.team.replace(/\/?$/, "/api/cloud/team");
                try {
                    await this.tryKeyAuthentication(url, AuthenticationType.BEARER, profile.apiToken);
                    profile.authenticationType = AuthenticationType.BEARER;
                } catch (e) {
                    try {
                        await this.tryKeyAuthentication(url, AuthenticationType.APPKEY, profile.apiToken);
                        profile.authenticationType = AuthenticationType.APPKEY;
                    } catch (err) {
                        logger.error(new FatalError("The provided team or api key is wrong."));
                        logger.error(err);
                    }
                }
                break;
            case ProfileType.DEVICE_CODE:
                try {
                    const deviceCodeIssuer = await Issuer.discover(profile.team);
                    const deviceCodeOAuthClient = new deviceCodeIssuer.Client({
                        client_id: "content-cli",
                        token_endpoint_auth_method: "none",
                    });
                    const deviceCodeHandle = await deviceCodeOAuthClient.deviceAuthorization({
                        scope: deviceCodeScopes.join(" ")
                    });
                    logger.info(`Continue authorization here: ${deviceCodeHandle.verification_uri_complete}`);
                    const deviceCodeTokenSet = await deviceCodeHandle.poll();
                    profile.apiToken = deviceCodeTokenSet.access_token;
                    profile.refreshToken = deviceCodeTokenSet.refresh_token;
                    profile.expiresAt = deviceCodeTokenSet.expires_at;
                } catch (err) {
                    logger.error(new FatalError("The provided team is wrong."));
                    logger.error(err);
                }
                break;
            case ProfileType.CLIENT_CREDENTIALS:
                const clientCredentialsIssuer = await Issuer.discover(profile.team);
                try {
                    // try with client secret basic
                    const clientCredentialsOAuthClient = new clientCredentialsIssuer.Client({
                        client_id: profile.clientId,
                        client_secret: profile.clientSecret,
                        token_endpoint_auth_method: ClientAuthenticationMethod.CLIENT_SECRET_BASIC,
                    });
                    const clientCredentialsTokenSet = await clientCredentialsOAuthClient.grant({
                        grant_type: "client_credentials",
                        scope: clientCredentialsScopes.join(" ")
                    });
                    profile.clientAuthenticationMethod = ClientAuthenticationMethod.CLIENT_SECRET_BASIC;
                    profile.apiToken = clientCredentialsTokenSet.access_token;
                    profile.expiresAt = clientCredentialsTokenSet.expires_at;
                } catch (e) {
                    try {
                        // try with client secret post
                        const clientCredentialsOAuthClient = new clientCredentialsIssuer.Client({
                            client_id: profile.clientId,
                            client_secret: profile.clientSecret,
                            token_endpoint_auth_method: ClientAuthenticationMethod.CLIENT_SECRET_POST,
                        });
                        const clientCredentialsTokenSet = await clientCredentialsOAuthClient.grant({
                            grant_type: "client_credentials",
                            scope: clientCredentialsScopes.join(" ")
                        });
                        profile.clientAuthenticationMethod = ClientAuthenticationMethod.CLIENT_SECRET_POST;
                        profile.apiToken = clientCredentialsTokenSet.access_token;
                        profile.expiresAt = clientCredentialsTokenSet.expires_at;
                    } catch (err) {
                        logger.error(new FatalError("The OAuth client configuration is incorrect. " +
                            "Check the id, secret and scopes for correctness."));
                    }
                }
                profile.scopes = [...clientCredentialsScopes];

                break;
            default:
                logger.error(new FatalError("Unsupported profile type"));
                break;
        }
    }

    public async refreshProfile(profile: Profile) : Promise<void> {
        if (!this.isProfileExpired(profile, expiryBuffer)) {
            return;
        }
        const issuer = await Issuer.discover(profile.team);
        if (profile.type === ProfileType.DEVICE_CODE) {
            try {
                const oauthClient = new issuer.Client({
                    client_id: "content-cli",
                    token_endpoint_auth_method: "none",
                });
                const tokenSet = await oauthClient.refresh(profile.refreshToken);
                profile.apiToken = tokenSet.access_token;
                profile.expiresAt = tokenSet.expires_at;
                profile.refreshToken = tokenSet.refresh_token;
            } catch (err) {
                logger.error(new FatalError("The profile cannot be refreshed. Please retry or recreate profile."));
            }
        }
        else {
            try {
                const oauthClient = new issuer.Client({
                    client_id: profile.clientId,
                    client_secret: profile.clientSecret,
                    token_endpoint_auth_method: profile.clientAuthenticationMethod,
                });
                const tokenSet = await oauthClient.grant({
                    grant_type: "client_credentials",
                    scope: profile.scopes.join(" ")
                });
                profile.apiToken = tokenSet.access_token;
                profile.expiresAt = tokenSet.expires_at;
            } catch (err) {
                logger.error(new FatalError("The profile cannot be refreshed. Please retry or recreate profile."));
            }
        }

        this.storeProfile(profile);
    }

    private getProfileEnvVariables(): any {
        return {
            teamUrl: this.getBaseTeamUrl(process.env.TEAM_URL),
            apiToken: process.env.API_TOKEN,
        };
    }

    private getBaseTeamUrl(teamUrl: string): string {
        if (!teamUrl) {
            return null;
        }

        const url = new URL(teamUrl);
        return url.origin;
    }

    private isProfileExpired(profile: Profile, buffer: number = 0): boolean {
        if (profile.type === null || profile.type === undefined || profile.type === ProfileType.KEY) {
            return false;
        }
        const now = new Date();
        const expirationTime = new Date(profile.expiresAt * 1000 - buffer);

        return now > expirationTime;
    }

    private tryKeyAuthentication(url: string, authType: AuthenticationType, apiToken: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            axios.get(url, {
                headers: {
                    Authorization: `${authType} ${apiToken}`
                }
            }).then(response => {
                if (response.status === 200 && response.data.domain) {
                    resolve();
                } else {
                    reject();
                }
            }).catch(() => {
                reject();
            })
        })
    }

    private checkIfMissingProfile(profileName: string): boolean {
        if (!profileName) {
            return true;
        }
    }

    private mapCelonisEnvProfile(): void {
        let celonisUrl = process.env.CELONIS_URL;
        if (!celonisUrl.startsWith("http://") && !celonisUrl.startsWith("https://")) {
            celonisUrl = `https://${celonisUrl}`;
        }
        process.env.TEAM_URL = celonisUrl;

        if (process.env.CELONIS_API_TOKEN) {
            process.env.API_TOKEN = process.env.CELONIS_API_TOKEN;
        } else {
            delete process.env.API_TOKEN;
        }
    }
}

export const profileService = new ProfileService();
