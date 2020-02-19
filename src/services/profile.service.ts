import { Profile } from "../interfaces/profile.interface";
import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../util/logger";

const homedir = require("os").homedir();

export class ProfileService {
    private static PROFILE_CONTAINER_PATH = path.resolve(homedir, ".celonis-content-cli-profiles");

    public static async findProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            try {
                const file = fs.readFileSync(
                    path.resolve(ProfileService.PROFILE_CONTAINER_PATH, this.constructProfileFileName(profileName)),
                    { encoding: "utf-8" }
                );
                resolve(JSON.parse(file));
            } catch (e) {
                reject(e);
            }
        });
    }

    public static storeProfile(profile: Profile): void {
        this.createProfileContainerIfNotExists();
        const newProfileFileName = this.constructProfileFileName(profile.name);
        fs.writeFileSync(
            path.resolve(ProfileService.PROFILE_CONTAINER_PATH, newProfileFileName),
            JSON.stringify(profile),
            {
                encoding: "utf-8",
            }
        );
    }

    private static createProfileContainerIfNotExists(): void {
        if (!fs.existsSync(ProfileService.PROFILE_CONTAINER_PATH)) {
            fs.mkdirSync(ProfileService.PROFILE_CONTAINER_PATH);
        }
    }

    private static constructProfileFileName(profileName: string): string {
        return profileName + ".json";
    }

    public static readAllProfiles(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const profiles = this.getAllFilesInDirectory();
            resolve(profiles);
        });
    }

    public static getAllFilesInDirectory(): string[] {
        let fileNames: [] = [];
        try {
            if (fs.existsSync(ProfileService.PROFILE_CONTAINER_PATH)) {
                fileNames = fs
                    // @ts-ignore
                    .readdirSync(ProfileService.PROFILE_CONTAINER_PATH, { withFileTypes: true })
                    .filter(dirent => !dirent.isDirectory() && dirent.name.endsWith(".json"))
                    .map(dirent => dirent.name.replace(".json", ""));
            }
        } catch (err) {
            logger.error(new FatalError(err));
        }
        return fileNames;
    }
}
