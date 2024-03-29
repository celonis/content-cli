import { AuthenticationType, Profile } from "../interfaces/profile.interface";
import { FatalError, logger } from "../util/logger";
import validUrl = require("valid-url");
import axios from "axios";

export class ProfileValidator {
    public static async validateProfile(profile: Profile): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            if (profile.name == null) {
                logger.error(new FatalError("The name can not be empty"));
            }
            if (profile.team == null) {
                logger.error(new FatalError("The team can not be empty"));
            }
            if (profile.apiToken == null) {
                logger.error(new FatalError("The api token can not be empty"));
            }
            if (!validUrl.isUri(profile.team)) {
                logger.error(new FatalError("The provided url is not a valid url."));
            }
            const url = profile.team.replace(/\/?$/, "/api/cloud/team");

            this.tryAuthenticationType(url, AuthenticationType.BEARER, profile.apiToken).then(() => {
                resolve(AuthenticationType.BEARER);
            }).catch(() => {
                this.tryAuthenticationType(url, AuthenticationType.APPKEY, profile.apiToken).then(() => {
                    resolve(AuthenticationType.APPKEY);
                }).catch(() => {
                    logger.error(new FatalError("The provided team or api key is wrong."));
                    reject();
                })
            });
        });
    }

    private static tryAuthenticationType(url: string, authType: AuthenticationType, apiToken: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            axios.get(url, {
                headers: {
                    Authorization: `${authType} ${apiToken}`
                }
            }).then(response => {
                if (response.status === 200 && response.data.domain) {
                    resolve();
                } else {
                    reject();
                }
            }).catch(() => {
                reject();
            })
        })
    }
}
