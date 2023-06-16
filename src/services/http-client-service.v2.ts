import {AuthenticationType, Profile} from "../interfaces/profile.interface";
import {CoreOptions, Headers, Response} from "request";
import request = require("request");
import {contextService} from "./context.service";
import {FatalError, logger} from "../util/logger";

class HttpClientServiceV2 {
    public async get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(this.resolveUrl(url), this.makeOptions(contextService.getContext().profile, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        }).catch(e => {
            throw new FatalError(e);
        });
    }

    public async getFileData(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request
                .post(this.resolveUrl(url), this.makeFileDownloadOptions(contextService.getContext().profile))
                .on("response", (response: Response) => {
                    const data: Buffer[] = [];
                    response.on("data", (chunk: Buffer) => {
                        data.push(chunk);
                    });
                    response.on("end", () => {
                        if (this.checkBadRequest(response.statusCode)) {
                            this.handleBadRequest(response.statusCode, data.toString(), reject);
                        } else {
                            this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                        }
                    });
                })
                .on("error", error => reject(error));
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

    private makeFileDownloadOptions(profile: Profile): object {
        return {
            headers: this.buildAuthorizationHeaders(profile),
            responseType: "binary",
        };
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

    private handleResponseStreamData(data, resolve, reject): void {
        if (data) {
            resolve(data);
            return;
        }

        logger.error("Could not get file stream from response");
        reject();
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
