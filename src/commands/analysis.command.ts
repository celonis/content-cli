import { ProfileService } from "../services/profile.service";
import { Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
const request = require("request");
import * as path from "path";
import * as fs from "fs";

export class AnalysisCommand {
    public static async pullAnalysis(profile: string, analysisId: string) {
        return new Promise((resolve, reject) => {
            ProfileService.findProfile(profile)
                .then((profile: Profile) => {
                    this.downloadAnalysisContent(analysisId, profile).then(results => {
                        try {
                            const filename = "analysis_" + results.analysis.name + ".json";
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

    private static async downloadAnalysisContent(analysisId: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options = {
                headers: {
                    authorization: `Bearer ${profile.apiToken}`,
                },
                qs: {
                    id: analysisId,
                },
            };

            let url = profile.team.replace(/\/?$/, `/process-mining/api/analysis/export`);
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
}
