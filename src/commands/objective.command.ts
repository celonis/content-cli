import { ProfileService } from "../services/profile.service";
import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
const request = require("request");
import * as path from "path";
import * as fs from "fs";

export class ObjectiveCommand {
    private profileService = new ProfileService();

    public async pullObjective(profile: string, objectiveId: string) {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(profile)
                .then((profile: Profile) => {
                    this.downloadObjectiveContent(objectiveId, profile).then(results => {
                        const objective = results[0];
                        try {
                            const filename = "objective_" + objective.objective.name + ".json";
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

    public async pushObjective(profile: string, filename: string) {
        return new Promise((resolve, reject) => {
            this.profileService
                .findProfile(profile)
                .then((profile: Profile) => {
                    this.uploadObjectiveContent(filename, profile)
                        .then(() => {
                            logger.info("Objective uploaded successfully!");
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

    private async downloadObjectiveContent(objectiveId: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                },
                qs: {
                    id: objectiveId,
                },
            };

            let url = profile.team.replace(/\/?$/, `/transformation-center/api/objectives/import`);
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

    private async uploadObjectiveContent(filename: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!fs.existsSync(path.resolve(process.cwd(), filename))) {
                logger.error(new FatalError("The provided file does not exit"));
                reject();
            }

            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    useDataModelId: "dummy",
                    serializedObjectiveExports: fs.readFileSync(path.resolve(process.cwd(), filename), {
                        encoding: "utf-8",
                    }),
                }),
            };

            let url = profile.team.replace(/\/?$/, `/transformation-center/api/objective-kpis/import`);
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
