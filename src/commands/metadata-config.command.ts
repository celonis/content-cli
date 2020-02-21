import { Profile } from "../interfaces/profile.interface";
import { ProfileService } from "../services/profile.service";
import { FatalError, logger } from "../util/logger";
const request = require("request");
import * as fs from "fs";
import * as path from "path";

export class MetadataConfigCommand {
    public static async pullMetadataConfig(profile: string, id: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.downloadYamlMetadataConfig(id, profile).then(config => {
                        try {
                            const filename = "metadata_" + config.id + ".yaml";
                            fs.writeFileSync(path.resolve(process.cwd(), filename), config.content, {
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

    public static async pushMetadataConfig(profile: string, filename: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.uploadMetadataConfig(filename, profile)
                        .then(metadata => {
                            logger.info("Metadata configuration uploaded successfully. New ID: " + metadata.id);
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

    public static async updateMetadataConfig(profile: string, id: string, filename: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.uploadUpdatedMetadataConfig(filename, id, profile)
                        .then(() => {
                            logger.info("Metadata configuration updated successfully.");
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

    private static async downloadYamlMetadataConfig(id, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                },
            };

            let url = profile.team.replace(/\/?$/, `/semantic-layer/api/yaml-metadata/${id}`);
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

    private static async uploadMetadataConfig(filename: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
                logger.error(new FatalError("The provided file does not exit"));
                reject();
            }
            const content = fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });

            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    content: content,
                }),
            };

            request.post(this.constructBaseMetadataEndpoint(profile), options, (err, res) => {
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

    private static async uploadUpdatedMetadataConfig(filename: string, id: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
                logger.error(new FatalError("The provided file does not exit"));
                reject();
            }
            const content = fs.readFileSync(path.resolve(process.cwd(), filename), { encoding: "utf-8" });

            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                    content: content,
                }),
            };

            const url = `${this.constructBaseMetadataEndpoint(profile)}/${id}`;
            request.put(url, options, (err, res) => {
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

    private static constructBaseMetadataEndpoint(profile: Profile): string {
        return profile.team.replace(/\/?$/, `/semantic-layer/api/yaml-metadata`);
    }
}
