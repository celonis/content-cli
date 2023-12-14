import { AuthenticationType, Profile } from "../interfaces/profile.interface";
import {logger} from "../util/logger";
import axios, {AxiosResponse, RawAxiosRequestHeaders} from "axios";
import * as FormData from "form-data";

export class HttpClientService {
    public async pushData(url: string, profile: Profile, body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const headers = this.buildAuthorizationHeaders(profile);

            if (body instanceof FormData) {
                headers["Content-Type"] = "multipart/form-data";
            }

            axios.post(url, body, {
                headers
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            });
        });
    }

    public async pullData(url: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.get(url, {
                headers: this.buildAuthorizationHeaders(profile)
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            });
        });
    }

    public async pullFileData(url: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.post(url, null, {
                headers: this.buildAuthorizationHeaders(profile),
                responseType: "stream"
            }).then(response => {
                const data: Buffer[] = [];
                response.data.on("data", (chunk: Buffer) => {
                    data.push(chunk);
                });
                response.data.on("end", () => {
                    if (this.checkBadRequest(response.status)) {
                        this.handleBadRequest(response.status, data.toString(), reject);
                    } else {
                        this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                    }
                })
            }).catch(err => {
                this.handleError(err, resolve, reject);
            });
        });
    }

    public async updateData(url: string, profile: Profile, body: object): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.put(url, body, {
                headers: this.buildAuthorizationHeaders(profile)
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            });
        });
    }

    public async findAll(url: string, profile: Profile): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.get(url, {
                headers: this.buildAuthorizationHeaders(profile)
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            });
        });
    }

    private buildAuthorizationHeaders(profile: Profile): RawAxiosRequestHeaders {
        const authenticationType = profile.authenticationType || AuthenticationType.BEARER;
        return {
            Authorization: `${authenticationType} ${profile.apiToken}`,
            "Content-Type": "application/json",
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
    private handleResponse(res: AxiosResponse, resolve, reject): void {
        if (this.checkBadRequest(res.status)) {
            this.handleBadRequest(res.status, res.data, reject);
            return;
        }
        resolve(res.data);
    }

    private handleError(err: any, resolve, reject): void {
        if (err.response) {
            this.handleResponse(err.response, resolve, reject);
        } else {
            reject(err.message);
        }
    }

    private checkBadRequest(statusCode: number): boolean {
        return statusCode >= 400;
    }

    // tslint:disable-next-line:typedef
    private handleBadRequest(statusCode, data, reject): void {
        if (data) {
            reject(JSON.stringify(data));
        } else {
            reject("Backend responded with status code " + statusCode);
        }
    }
}
