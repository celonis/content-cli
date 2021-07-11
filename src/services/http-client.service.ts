import { Profile } from "../interfaces/profile.interface";
import { logger } from "../util/logger";
import { CoreOptions, Headers, Response } from "request";

import request = require("request");

export class HttpClientService {
    public async pushData(url: string, headers: Headers, body: object): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.post(url, this.makeOptions(headers, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async pullData(url: string, headers: Headers): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(url, this.makeOptions(headers, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async pullFileData(url: string, headers: Headers): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request
                .post(url, this.makeFileDownloadOptions(headers))
                .on("response", (response: Response) => {
                    const data: Buffer[] = [];
                    response.on("data", (chunk: Buffer) => {
                        data.push(chunk);
                    });
                    response.on("end", () => {
                        if (this.checkBadRequest(response.statusCode)) {
                            this.handleBadRequest(response, data.toString(), reject);
                        } else {
                            this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                        }
                    });
                })
                .on("error", error => reject(error));
        });
    }

    public async updateData(url: string, headers: Headers, body: object): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.put(url, this.makeOptions(headers, body), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async findAll(url: string, headers: Headers): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(url, this.makeOptions(headers, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    public async authenticate(profile: Profile): Promise<any> {
        return new Promise<any>(resolve => {
            const url = profile.team.replace(/\/?$/, "/api/cloud");
            let headers = {
                authorization: `Bearer ${profile.apiToken}`,
                "content-type": "application/json",
            };
            this.checkAuthorization(url, headers)
                .then(() => {
                    resolve(headers);
                })
                .catch(() => {
                    headers.authorization = `AppKey ${profile.apiToken}`;
                    this.checkAuthorization(url, headers)
                        .then(() => {
                            resolve(headers);
                        })
                        .catch(() => {
                            resolve(headers);
                        });
                });
        });
    }

    private async checkAuthorization(url: string, headers: Headers): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            request.get(url, this.makeOptions(headers, null), (err, res) => {
                this.handleResponse(res, resolve, reject);
            });
        });
    }

    private makeOptions(headers: Headers, body: object = {}): CoreOptions {
        const options = {
            headers: headers,
        };

        return Object.assign(options, body);
    }

    private makeFileDownloadOptions(headers: Headers): object {
        return {
            headers: headers,
            responseType: "binary",
        };
    }

    // tslint:disable-next-line:typedef
    private handleResponseStreamData(data, resolve, reject): void {
        if (data) {
            resolve(data);
            return;
        }

        logger.error("Could not get file stream from response");
        reject();
    }

    // tslint:disable-next-line:typedef
    private handleResponse(res: Response, resolve, reject): void {
        if (this.checkBadRequest(res.statusCode)) {
            this.handleBadRequest(res, res.body, reject);
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
}
