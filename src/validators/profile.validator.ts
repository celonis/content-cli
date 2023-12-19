import { AuthenticationType, Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
import validUrl = require("valid-url");
import request = require("request");

interface CloudResponse {
    domain: string;
}

export class ProfileValidator {
    public static async validateProfile(profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (profile.name == null) {
                logger.error(new FatalError("The name can not be empty"));
            }
            if (profile.team == null) {
                logger.error(new FatalError("The team can not be empty"));
            }
            if (profile.type === "Key" && profile.apiToken == null) {
                logger.error(new FatalError("The api token can not be empty for this profile type"));
            }
            if (profile.type === "OAuth" && (profile.clientId == null || profile.clientSecret == null)) {
                logger.error(new FatalError("The client id and client secret can not be empty for this profile type"));
            }
            if (!validUrl.isUri(profile.team)) {
                logger.error(new FatalError("The provided url is not a valid url."));
            }

            if (profile.type === "OAuth") {
                resolve(AuthenticationType.BEARER);
            }
            else {
                const url = profile.team.replace(/\/?$/, "/api/cloud/team");

                const options = {
                    headers: {
                        authorization: `${AuthenticationType.BEARER} ${profile.apiToken}`,
                    },
                };

                request.get(url, options, (err, res) => {
                    let body : CloudResponse = this.parseBody(res.body);
                    if (res.statusCode >= 400 || !body?.domain) {
                        options.headers.authorization = `${AuthenticationType.APPKEY} ${profile.apiToken}`;
                        request.get(url, options, (err, res) => {
                            body = this.parseBody(res.body);
                            if (res.statusCode === 200 && body?.domain) {
                                resolve(AuthenticationType.APPKEY);
                            } else {
                                logger.error(new FatalError("The provided team or api key is wrong."));
                                reject();
                            }
                        });
                    } else {
                        resolve(AuthenticationType.BEARER);
                    }
                });
            }
        });
    }

    private static parseBody(responseBody: string): CloudResponse {
        try {
            return JSON.parse(responseBody);
            // tslint:disable-next-line:no-empty
        } catch (ignored) {}
    }

    private static getScopes(): string {
        return "studio.packages";
    }
}
