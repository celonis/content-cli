import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../utils/logger";
import os = require("os");
import { AuthenticationType, GitProfile } from "./git-profile.interface";
import { ProfileValidator } from "./git-profile.validator";

export interface GitConfig {
    defaultProfile: string;
}

export class GitProfileService {
    private homedir: string = os.homedir();
    private gitProfileContainerPath = path.resolve(this.homedir, ".celonis-content-cli-git-profiles");
    private configContainer = path.resolve(this.gitProfileContainerPath, "config.json");

    public async findProfile(profileName: string): Promise<GitProfile> {
        return new Promise<GitProfile>((resolve, reject) => {
            try {
                if (process.env.USERNAME && process.env.GIT_TOKEN && process.env.REPOSITORY) {
                    resolve(this.buildProfileFromEnvVariables());
                } else {
                    const file = fs.readFileSync(
                        path.resolve(this.gitProfileContainerPath, this.constructProfileFileName(profileName)),
                        { encoding: "utf-8" }
                    );
                    const profile : GitProfile = JSON.parse(file);
                    resolve(profile)
                }
            } catch (e) {
                reject(`The Git profile "${profileName}" couldn't be resolved.`);
            }
        });
    }

    public async makeDefaultProfile(profileName: string): Promise<GitProfile> {
        return new Promise<GitProfile>((resolve, reject) => {
            this.findProfile(profileName)
                .then((profile: GitProfile) => {
                    this.createProfileContainerIfNotExists();
                    this.storeConfig({ defaultProfile: profileName });
                    resolve(profile);
                })
                .catch(err => {
                    logger.error(new FatalError("Git Profile does not exit."));
                    reject(err);
                });
        });
    }

    public getDefaultProfile(): string {
        if (fs.existsSync(this.configContainer)) {
            const config = JSON.parse(fs.readFileSync(this.configContainer, { encoding: "utf-8" })) as GitConfig;
            return config.defaultProfile;
        } else {
            return null;
        }
    }

    public storeProfile(profile: GitProfile): void {
        this.createProfileContainerIfNotExists();
        const newProfileFileName = this.constructProfileFileName(profile.name);
        fs.writeFileSync(path.resolve(this.gitProfileContainerPath, newProfileFileName), JSON.stringify(profile), {
            encoding: "utf-8",
        });
    }

    private async buildProfileFromEnvVariables(): Promise<GitProfile> {
        const profileVariables = this.getProfileEnvVariables();
        const profile: GitProfile = {
            name: profileVariables.repository,
            repository: profileVariables.repository,
            token: profileVariables.apiToken,
            authenticationType: AuthenticationType.SSH,
        };
        profile.authenticationType = await ProfileValidator.validateProfile(profile);
        return profile;
    }

    private storeConfig(config: GitConfig): void {
        fs.writeFileSync(this.configContainer, JSON.stringify(config), { encoding: "utf-8" });
    }

    private createProfileContainerIfNotExists(): void {
        if (!fs.existsSync(this.gitProfileContainerPath)) {
            fs.mkdirSync(this.gitProfileContainerPath);
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
            if (fs.existsSync(this.gitProfileContainerPath)) {
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

    private getProfileEnvVariables(): any {
        return {
            username: process.env.USERNAME,
            token: process.env.GIT_TOKEN,
            repository: process.env.REPOSITORY,
        };
    }
}
