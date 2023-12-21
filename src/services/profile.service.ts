import {AuthenticationType, Profile} from "../interfaces/profile.interface";
import {ProfileValidator} from "../validators/profile.validator";
import * as path from "path";
import * as fs from "fs";
import {FatalError, logger} from "../util/logger";
import {Issuer} from "openid-client";
import axios from "axios";
import os = require("os");

const homedir = os.homedir();
// use 5 seconds buffer to avoid rare cases when accessToken is just about to expire before the command is sent
const expiryBuffer = 5000;
const scopes = ["studio.spaces", "studio.packages", "studio.widgets", "integration.data-models:read",
    "integration.data-pools", "transformation-center.kpis", "transformation-center.content:export"];

export interface Config {
    defaultProfile: string;
}

export class ProfileService {
    private profileContainerPath = path.resolve(homedir, ".celonis-content-cli-profiles");
    private configContainer = path.resolve(this.profileContainerPath, "config.json");

    public async findProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            try {
                if (process.env.TEAM_URL && process.env.API_TOKEN) {
                    resolve(this.buildProfileFromEnvVariables());
                } else {
                    const file = fs.readFileSync(
                        path.resolve(this.profileContainerPath, this.constructProfileFileName(profileName)),
                        { encoding: "utf-8" }
                    );
                    const profile : Profile = JSON.parse(file);
                    this.refreshProfile(profile)
                        .then(() => resolve(profile));
                }
            } catch (e) {
                reject(
                    "No profile provided. Please provide a profile or an TEAM_URL and API_TOKEN through env variables"
                );
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
            type: "Key"
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
        if (profile.type === "Key") {
            const url = profile.team.replace(/\/?$/, "/api/cloud/team");
            this.tryKeyAuthentication(url, AuthenticationType.BEARER, profile.apiToken).then(() => {
                profile.authenticationType = AuthenticationType.BEARER;
            }).catch(() => {
                this.tryKeyAuthentication(url, AuthenticationType.APPKEY, profile.apiToken).then(() => {
                    profile.authenticationType = AuthenticationType.APPKEY;
                }).catch(() => {
                    logger.error(new FatalError("The provided team or api key is wrong."));
                })
            });
        }
        else {
            const issuer = await Issuer.discover(profile.team);
            const oauthClient = new issuer.Client({
                client_id: "content-cli",
                token_endpoint_auth_method: "none",
            });
            const deviceCodeHandle = await oauthClient.deviceAuthorization({
                scope: scopes.join(" ")
            });
            logger.info(`Continue authorization here: ${deviceCodeHandle.verification_uri_complete}`);
            const tokenSet = await deviceCodeHandle.poll();
            profile.apiToken = tokenSet.access_token;
            profile.refresh_token = tokenSet.refresh_token;
            profile.expires_at = tokenSet.expires_at;
        }
    }

    public async refreshProfile(profile: Profile) : Promise<void> {
        if (!this.isProfileExpired(profile, expiryBuffer)) {
            return;
        }
        try {
            const issuer = await Issuer.discover(profile.team);
            const oauthClient = new issuer.Client({
                client_id: "content-cli",
                token_endpoint_auth_method: "none",
            });
            const tokenSet = await oauthClient.refresh(profile.refresh_token);
            profile.apiToken = tokenSet.access_token;
            profile.expires_at = tokenSet.expires_at;
            profile.refresh_token = tokenSet.refresh_token;
            this.storeProfile(profile);
        } catch (err) {
            logger.error(new FatalError("The profile cannot be refreshed. Please retry or recreate profile."));
        }
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
        if (profile.type === "Key") {
            return false;
        }
        const now = new Date();
        const expirationTime = new Date(profile.expires_at * 1000 - buffer);

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
}

export  const profileService = new ProfileService();
