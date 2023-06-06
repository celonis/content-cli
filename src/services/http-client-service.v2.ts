import {AuthenticationType, Profile} from "../interfaces/profile.interface";
import {CoreOptions, Headers, Response} from "request";
import request = require("request");
import { contextService} from "./context.service";
import {FatalError, logger} from "../util/logger";

class HttpClientServiceV2 {
    public async get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(this.resolveUrl(url), this.makeOptions(contextService.getContext().profile, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        }).catch(e => {
            logger.error(new FatalError(e));
        });
    }

    private resolveUrl(url: string): string {
        return contextService.getContext().profile.team.replace(/\/?$/, url);
    }

    private handleResponse(res: Response, resolve, reject): void {
        if (this.checkBadRequest(res.statusCode)) {
            this.handleBadRequest(res.statusCode, res.body, reject);
            return;
        }
        let body = {};
        try {
            if (res.body) {
                body = JSON.parse(res.body);
            }
        } catch (e) {
            reject("Something went wrong. Please check that you have the right url and api key.");
            return;
        }
        resolve(body);
    }

    private checkBadRequest(statusCode: number): boolean {
        return statusCode >= 400;
    }

    // tslint:disable-next-line:typedef
    private handleBadRequest(statusCode, data, reject): void {
        if (data) {
            reject(data);
        } else {
            reject("Backend responded with status code " + statusCode);
        }
    }


    private makeOptions(profile: Profile, body: object = {}): CoreOptions {
        const options = {
            headers: this.buildAuthorizationHeaders(profile),
        };

        return Object.assign(options, body);
    }

    private buildAuthorizationHeaders(profile: Profile): Headers {
        const authenticationType = profile.authenticationType || AuthenticationType.BEARER;
        return {
            authorization: `${authenticationType} ${profile.apiToken}`,
            "content-type": "application/json",
        };
    }
}

export const httpClientV2 = new HttpClientServiceV2();
