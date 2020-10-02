import { Profile } from "../interfaces/profile.interface";
import { logger } from "../util/logger";
import { Response } from "request";

const request = require("request");

export class HttpClientService {
    public async pushData(url, profile: Profile, body: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.post(url, this.makeOptions(profile, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async pullData(url, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(url, this.makeOptions(profile, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async pullFileData(url, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request
                .post(url, this.makeFileDownloadOptions(profile))
                .on("response", (response: Response) => {
                    const data: Buffer[] = [];
                    response.on("data", (chunk: Buffer) => {
                        data.push(chunk);
                    });
                    response.on("end", () => {
                        this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                    });
                })
                .on("error", error => reject(error));
        });
    }

    public async updateData(url, profile: Profile, body: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.put(url, this.makeOptions(profile, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    private makeOptions(profile: Profile, body: any) {
        const options = {
            headers: this.buildRequestHeadersWithAuthentication(profile.apiToken),
        };

        return Object.assign(options, body);
    }

    private makeFileDownloadOptions(profile: Profile) {
        return {
            headers: this.buildRequestHeadersWithAuthentication(profile.apiToken),
            responseType: "binary",
        };
    }

    private buildRequestHeadersWithAuthentication(apiToken: string) {
        return {
            authorization: `Bearer ${apiToken}`,
            "content-type": "application/json",
        };
    }

    private handleResponseStreamData(data, resolve, reject) {
        if (data) {
            resolve(data);
            return;
        }

        logger.error("Could not get file stream from response");
        reject();
    }

    private handleResponse(res, resolve, reject) {
        if (res.statusCode >= 400) {
            if (res.body) {
                reject(res.body);
            } else {
                reject("Backend responded with status code " + res.statusCode);
            }
        } else {
            let body = {};
            try {
                if (res.body) {
                    body = JSON.parse(res.body);
                }
            } catch (e) {
                reject("Something went wrong. Please check that you have the right url and api key.");
            }
            resolve(body);
        }
    }
}
