import { ProfileService } from "../services/profile.service";
import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";

const request = require("request");
import * as path from "path";
import * as fs from "fs";

export class SkillCommand {
    public static async pullSkill(profile: string, projectId: string, skillId: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.downloadSkillContent(projectId, skillId, profile).then(results => {
                        try {
                            const filename = results.name + ".json";
                            fs.writeFileSync(path.resolve(process.cwd(), filename), JSON.stringify(results), {
                                encoding: "utf-8",
                            });
                            logger.info("File downloaded. New filename: " + filename);
                            resolve();
                        } catch (e) {
                            logger.error(new FatalError(e));
                            reject();
                        }
                    });
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    public static async pushSkill(profile: string, projectId: string, filename: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.uploadSkillContent(projectId, filename, profile)
                        .then(skill => {
                            logger.info("Skill uploaded successfully. New skill ID: " + skill.id);
                            resolve();
                        })
                        .catch(() => {
                            reject();
                        });
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                });
        });
    }

    private static async downloadSkillContent(projectId: string, skillId: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                },
            };

            let url = profile.team.replace(/\/?$/, `/action-engine/api/projects/${projectId}/skills/${skillId}/export`);
            request.get(url, options, (err, res) => {
                if (res.statusCode >= 400) {
                    logger.error(new FatalError(res.body));
                    reject();
                } else {
                    let body;
                    try {
                        body = JSON.parse(res.body);
                    } catch (e) {
                        logger.error(
                            new FatalError(
                                "Something went wrong. Please check that you have the right url and api key."
                            )
                        );
                        reject();
                    }
                    resolve(body);
                }
            });
        });
    }

    private static async uploadSkillContent(projectId: string, filename: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
                logger.error(new FatalError("The provided file does not exit"));
                reject();
            }

            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                },
                formData: {
                    file: fs.createReadStream(path.resolve(process.cwd(), filename), { encoding: "binary" }),
                },
            };

            let url = profile.team.replace(/\/?$/, `/action-engine/api/projects/${projectId}/skills/import-file`);
            request.post(url, options, (err, res) => {
                if (res.statusCode >= 400) {
                    logger.error(new FatalError(res.body));
                    reject();
                } else {
                    let body;
                    try {
                        body = JSON.parse(res.body);
                    } catch (e) {
                        logger.error(
                            new FatalError(
                                "Something went wrong. Please check that you have the right url and api key."
                            )
                        );
                        reject();
                    }
                    resolve(body);
                }
            });
        });
    }
}
