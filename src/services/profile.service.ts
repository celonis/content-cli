import { Profile } from "../interfaces/profile.interface";
import * as path from "path";
import * as fs from "fs";
import { FatalError, logger } from "../util/logger";
const homedir = require("os").homedir();

export class ProfileService {
    private profileContainerPath = path.resolve(homedir, ".celonis-content-cli-profiles");

    public async findProfile(profileName: string): Promise<Profile> {
        return new Promise<Profile>((resolve, reject) => {
            try {
                const file = fs.readFileSync(
                    path.resolve(this.profileContainerPath, this.constructProfileFileName(profileName)),
                    { encoding: "utf-8" }
                );
                resolve(JSON.parse(file));
            } catch (e) {
                reject(e);
            }
        });
    }

    public storeProfile(profile: Profile): void {
        this.createProfileContainerIfNotExists();
        const newProfileFileName = this.constructProfileFileName(profile.name);
        fs.writeFileSync(path.resolve(this.profileContainerPath, newProfileFileName), JSON.stringify(profile), {
            encoding: "utf-8",
        });
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
                    .filter(dirent => !dirent.isDirectory() && dirent.name.endsWith(".json"))
                    .map(dirent => dirent.name.replace(".json", ""));
            }
        } catch (err) {
            logger.error(new FatalError(err));
        }
        return fileNames;
    }
}
