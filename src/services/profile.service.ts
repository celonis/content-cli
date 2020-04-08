import { Profile } from "../interfaces/profile.interface";
import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../util/logger";

const homedir = require("os").homedir();

export interface Config {
    defaultProfile: string;
}

export class ProfileService {
    private profileContainerPath = path.resolve(homedir, ".celonis-content-cli-profiles");
    private configContainer = path.resolve(this.profileContainerPath, "config.json");

    public async findProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            try {
                const file = fs.readFileSync(
                    path.resolve(this.profileContainerPath, this.constructProfileFileName(profileName)),
                    { encoding: "utf-8" }
                );
                resolve(JSON.parse(file));
            } catch (e) {
                resolve(this.buildProfileFromEnvVariables());
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
        fs.writeFileSync(path.resolve(this.profileContainerPath, newProfileFileName), JSON.stringify(profile), {
            encoding: "utf-8",
        });
    }

    private buildProfileFromEnvVariables(): Promise<Profile> {
        const teamUrl = process.env.TEAM_URL;
        const apiToken = process.env.API_TOKEN;

        return new Promise<Profile>((resolve, reject) => {
            if (!teamUrl || !apiToken) {
                reject(
                    "No profile provided. Please provide a profile or an TEAM_URL and API_TOKEN through env variables"
                );
            }

            resolve({
                name: teamUrl,
                team: teamUrl,
                apiToken: apiToken,
            });
        });
    }

    private storeConfig(config: Config) {
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
        let fileNames: [] = [];
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
}
