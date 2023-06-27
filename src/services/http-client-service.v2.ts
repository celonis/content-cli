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

    public async post(url: string, body:any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.post(this.resolveUrl(url), this.makeOptions(contextService.getContext().profile, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        }).catch(e => {
            throw new FatalError(e);
        });
    }

    public async postJson(url: string, body:any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.post(this.resolveUrl(url), this.makeOptionsJson(contextService.getContext().profile, JSON.stringify(body), "application/json;charset=utf-8"), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        }).catch(e => {
            throw new FatalError(e);
        });
    }

    public async put(url: string, body:object): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.put(this.resolveUrl(url), this.makeOptionsJson(contextService.getContext().profile, JSON.stringify(body), "application/json;charset=utf-8"), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        }).catch(e => {
            throw new FatalError(e);
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

    private makeOptionsJson(profile: Profile, body: any, contentType: string): CoreOptions {
        return {
            headers: this.buildAuthorizationHeaders(profile, contentType),
            body: body
        };
    }

    private buildAuthorizationHeaders(profile: Profile, contentType?: string): Headers {
        const authenticationType = profile.authenticationType || AuthenticationType.BEARER;
        return {
            authorization: `${authenticationType} ${profile.apiToken}`,
            "content-type": contentType ?? "application/json",
        };
    }
}

export const httpClientV2 = new HttpClientServiceV2();
