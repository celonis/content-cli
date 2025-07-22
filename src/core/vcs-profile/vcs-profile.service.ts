import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../utils/logger";
import os = require("os");
import { AuthenticationType, VcsProfile, VcsType } from "./vcs-profile.interface";
import { ProfileValidator } from "./vcs-profile.validator";

export interface VcsConfig {
    defaultProfile: string;
}

export class VcsProfileService {
    private homedir: string = os.homedir();
    private vcsProfileContainerPath = path.resolve(this.homedir, ".celonis-content-cli-vcs-profiles");
    private configContainer = path.resolve(this.vcsProfileContainerPath, "config.json");

    public async findProfile(profileName: string): Promise<VcsProfile> {
        return new Promise<VcsProfile>((resolve, reject) => {
            if (process.env.USERNAME && process.env.GIT_TOKEN && process.env.REPOSITORY) {
                resolve(this.buildProfileFromEnvVariables());
            } else {
                if (!profileName) {
                    reject(new Error("No profile was found"));
                }
                this.createProfileContainerIfNotExists();
                const file = fs.readFileSync(
                    path.resolve(this.vcsProfileContainerPath, this.constructProfileFileName(profileName)),
                    { encoding: "utf-8" }
                );
                const profile : VcsProfile = JSON.parse(file);
                resolve(profile)
            }
        });
    }

    public async makeDefaultProfile(profileName: string): Promise<VcsProfile> {
        return new Promise<VcsProfile>((resolve, reject) => {
            this.findProfile(profileName)
                .then((profile: VcsProfile) => {
                    this.createProfileContainerIfNotExists();
                    this.storeConfig({ defaultProfile: profileName });
                    resolve(profile);
                })
                .catch(err => {
                    logger.error(new FatalError("VCS Profile does not exit."));
                    reject(err);
                });
        });
    }

    public getDefaultProfile(): string {
        if (fs.existsSync(this.configContainer)) {
            const config = JSON.parse(fs.readFileSync(this.configContainer, { encoding: "utf-8" })) as VcsConfig;
            return config.defaultProfile;
        } else {
            return null;
        }
    }

    public storeProfile(profile: VcsProfile): void {
        this.createProfileContainerIfNotExists();
        const newProfileFileName = this.constructProfileFileName(profile.name);
        fs.writeFileSync(path.resolve(this.vcsProfileContainerPath, newProfileFileName), JSON.stringify(profile), {
            encoding: "utf-8",
        });
    }

    private async buildProfileFromEnvVariables(): Promise<VcsProfile> {
        const profileVariables = this.getProfileEnvVariables();
        const profile: VcsProfile = {
            name: profileVariables.repository,
            repository: profileVariables.repository,
            token: profileVariables.apiToken,
            authenticationType: AuthenticationType.SSH,
            vcsType: VcsType.GIT
        };
        profile.authenticationType = await ProfileValidator.validateProfile(profile);
        return profile;
    }

    private storeConfig(config: VcsConfig): void {
        fs.writeFileSync(this.configContainer, JSON.stringify(config), { encoding: "utf-8" });
    }

    private createProfileContainerIfNotExists(): void {
        if (!fs.existsSync(this.vcsProfileContainerPath)) {
            fs.mkdirSync(this.vcsProfileContainerPath);
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
            if (fs.existsSync(this.vcsProfileContainerPath)) {
                fileNames = fs
                    // @ts-ignore
                    .readdirSync(this.vcsProfileContainerPath, { withFileTypes: true })
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
