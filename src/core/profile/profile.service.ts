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
/** All OAuth scopes; used for both device code and client credentials. */
const OAUTH_SCOPES = ["studio", "package-manager", "integration.data-pools", "action-engine.projects"];
/** Device code fallback: try without action-engine.projects if all 4 scopes fail. */
const DEVICE_CODE_SCOPES_WITHOUT_ACTION_ENGINE = ["studio", "package-manager", "integration.data-pools"];

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
                const deviceCodeIssuer = await Issuer.discover(profile.team);
                const deviceCodeOAuthClient = new deviceCodeIssuer.Client({
                    client_id: "content-cli",
                    token_endpoint_auth_method: "none",
                });
                const deviceCodeScopeAttempts: string[][] = [OAUTH_SCOPES, DEVICE_CODE_SCOPES_WITHOUT_ACTION_ENGINE];
                let deviceCodeSuccess = false;
                for (const scopeList of deviceCodeScopeAttempts) {
                    try {
                        const deviceCodeHandle = await deviceCodeOAuthClient.deviceAuthorization({
                            scope: scopeList.join(" "),
                        });
                        logger.info(`Continue authorization here: ${deviceCodeHandle.verification_uri_complete}`);
                        const deviceCodeTokenSet = await deviceCodeHandle.poll();
                        profile.apiToken = deviceCodeTokenSet.access_token;
                        profile.refreshToken = deviceCodeTokenSet.refresh_token;
                        profile.expiresAt = deviceCodeTokenSet.expires_at;
                        deviceCodeSuccess = true;
                        break;
                    } catch (err) {
                        // This scope set failed; try next or fail below
                    }
                }
                if (!deviceCodeSuccess) {
                    throw new FatalError(
                        "Device code authorization failed. The provided team or requested scopes may be invalid."
                    );
                }
                break;
            case ProfileType.CLIENT_CREDENTIALS:
                const clientCredentialsIssuer = await Issuer.discover(profile.team);
                const basicResult = await this.tryClientCredentialsGrant(
                    clientCredentialsIssuer,
                    profile,
                    ClientAuthenticationMethod.CLIENT_SECRET_BASIC
                );
                if (basicResult) {
                    profile.clientAuthenticationMethod = ClientAuthenticationMethod.CLIENT_SECRET_BASIC;
                    profile.apiToken = basicResult.tokenSet.access_token;
                    profile.expiresAt = basicResult.tokenSet.expires_at;
                    profile.scopes = basicResult.scopes;
                } else {
                    const postResult = await this.tryClientCredentialsGrant(
                        clientCredentialsIssuer,
                        profile,
                        ClientAuthenticationMethod.CLIENT_SECRET_POST
                    );
                    if (postResult) {
                        profile.clientAuthenticationMethod = ClientAuthenticationMethod.CLIENT_SECRET_POST;
                        profile.apiToken = postResult.tokenSet.access_token;
                        profile.expiresAt = postResult.tokenSet.expires_at;
                        profile.scopes = postResult.scopes;
                    } else {
                        throw new FatalError(
                            "The OAuth client configuration is incorrect. " +
                            "Check the id, secret and allowed scopes for this client."
                        );
                    }
                }
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

    /**
     * Returns all non-empty combinations of scopes, ordered by size descending (4, then 3, 2, 1).
     * Order within a combination does not matter; each set is tried once.
     */
    private getScopeCombinationsOrderedBySize(scopes: string[]): string[][] {
        function combinations<T>(arr: T[], k: number): T[][] {
            if (k === 0) return [[]];
            if (k > arr.length) return [];
            const result: T[][] = [];
            for (let i = 0; i <= arr.length - k; i++) {
                const rest = combinations(arr.slice(i + 1), k - 1);
                rest.forEach(r => result.push([arr[i], ...r]));
            }
            return result;
        }
        return [
            ...combinations(scopes, 4),
            ...combinations(scopes, 3),
            ...combinations(scopes, 2),
            ...combinations(scopes, 1),
        ];
    }

    /**
     * Tries to obtain a client_credentials token. First tries with all scopes (including
     * action-engine.projects); if no token is returned, tries again without action-engine.projects.
     * Returns { tokenSet, scopes } or null if no grant succeeded.
     */
    private async tryClientCredentialsGrant(
        issuer: import("openid-client").Issuer<import("openid-client").Client>,
        profile: Profile,
        tokenEndpointAuthMethod: ClientAuthenticationMethod
    ): Promise<{ tokenSet: { access_token: string; expires_at: number; scope?: string }; scopes: string[] } | null> {
        const Client = issuer.Client as new (args: object) => {
            grant: (params: { grant_type: string; scope?: string }) => Promise<{ access_token: string; expires_at: number; scope?: string }>;
        };
        const client = new Client({
            client_id: profile.clientId,
            client_secret: profile.clientSecret,
            token_endpoint_auth_method: tokenEndpointAuthMethod,
        });

        const scopeAttempts = this.getScopeCombinationsOrderedBySize(OAUTH_SCOPES);

        for (const scopeList of scopeAttempts) {
            try {
                const tokenSet = await client.grant({
                    grant_type: "client_credentials",
                    scope: scopeList.join(" "),
                });
                if (tokenSet && tokenSet.access_token) {
                    const scopes = this.extractScopesFromTokenSet(tokenSet, scopeList);
                    return { tokenSet, scopes };
                }
            } catch (_e) {
                // This scope set failed (e.g. invalid_scope); try next
            }
        }
        return null;
    }

    /**
     * Extracts granted scopes from the token response (OAuth 2.0 scope parameter).
     * Used at profile creation so we store the scopes the server actually granted for this client.
     */
    private extractScopesFromTokenSet(tokenSet: { scope?: string }, fallbackScopes: string[]): string[] {
        if (tokenSet.scope && typeof tokenSet.scope === "string") {
            const scopes = tokenSet.scope.trim().split(/\s+/).filter(Boolean);
            if (scopes.length > 0) {
                return scopes;
            }
        }
        return [...fallbackScopes];
    }
}

export const profileService = new ProfileService();
