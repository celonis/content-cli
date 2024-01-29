import { AuthenticationType, Profile } from "../interfaces/profile.interface";
import { contextService } from "./context.service";
import { FatalError, logger } from "../util/logger";
import {TracingUtils} from "../util/tracing";
import {VersionUtils} from "../util/version";
import axios, {AxiosResponse, RawAxiosRequestHeaders} from "axios";
import * as FormData from "form-data";

class HttpClientServiceV2 {

    public async get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.get(this.resolveUrl(url), {
                headers: this.buildHeaders(contextService.getContext().profile)
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async getFile(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.get(this.resolveUrl(url), {
                headers: this.buildHeaders(contextService.getContext().profile),
                responseType: "stream"
            }).then(response => {
                const data: Buffer[] = [];
                response.data.on("data", (chunk: Buffer) => {
                    data.push(chunk);
                });
                response.data.on("end", () => {
                    if (this.checkBadRequest(response.status)) {
                        this.handleBadRequest(response.status, response.data, reject);
                    } else {
                        this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                    }
                });
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        });
    }

    public async postFile(url: string, body: any, parameters?: {}): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const formData = new FormData();
            formData.append("package", body.formData.package);
            axios.post(
                this.resolveUrl(url),
                formData,
                {
                    headers: {
                        ...this.buildHeaders(contextService.getContext().profile, "multipart/form-data"),
                        ...formData.getHeaders()
                    },
                    params: parameters
                }
            ).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async post(url: string, body: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.post(
                this.resolveUrl(url),
                typeof body === "string" || body instanceof String ? body : JSON.stringify(body),
                {
                    headers: this.buildHeaders(contextService.getContext().profile, "application/json;charset=utf-8")
                }
            ).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async put(url: string, body: object): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.put(
                this.resolveUrl(url),
                JSON.stringify(body),
                {
                    headers: this.buildHeaders(contextService.getContext().profile, "application/json;charset=utf-8")
                }
            ).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async delete(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.delete(this.resolveUrl(url), {
                headers: this.buildHeaders(contextService.getContext().profile, "application/json;charset=utf-8")
            }).then(response => {
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async downloadFile(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            axios.post(this.resolveUrl(url), null, {
                headers: this.buildHeaders(contextService.getContext().profile),
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
            })
        });
    }

    private handleResponseStreamData(data, resolve, reject): void {
        if (data) {
            resolve(data);
            return;
        }

        logger.error("Could not get file stream from response");
        reject();
    }

    private resolveUrl(url: string): string {
        return contextService.getContext().profile.team.replace(/\/?$/, url);
    }

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

    private buildHeaders(profile: Profile, contentType?: string): RawAxiosRequestHeaders {
        return {
            ...this.buildAuthorizationHeaders(profile, contentType),
            ...TracingUtils.getTracingHeaders(),
            "User-Agent": "content-cli v" + VersionUtils.getCurrentCliVersion()
        }
    }

    private buildAuthorizationHeaders(profile: Profile, contentType?: string): RawAxiosRequestHeaders {
        const authenticationType = profile.authenticationType || AuthenticationType.BEARER;
        return {
            Authorization: `${authenticationType} ${profile.apiToken}`,
            "Content-Type": contentType ?? "application/json",
        };
    }
}

export const httpClientV2 = new HttpClientServiceV2();
