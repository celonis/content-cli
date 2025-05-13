import { Injectable } from '@nestjs/common';
import {AxiosInitializer} from "./axios-initializer";
import {FatalError} from "../logger.service";
import {AuthenticationType, Profile} from "../profile/profile.interfaces";
import { AxiosResponse, RawAxiosRequestHeaders} from "axios";
import {TracingUtils} from "./tracing";
import {VersionUtils} from "../version";
import {logger} from "nx/src/utils/logger";
import {ContextService} from "../profile/context.service";
import * as FormData from "form-data";

@Injectable()
export class HttpClientService {
    private axios;
    private contextService: ContextService;

    constructor(contextService: ContextService) {
        this.axios = AxiosInitializer.initializeAxios();
        this.contextService = contextService;
    }

    public async get(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.axios.get(this.resolveUrl(url), {
                headers: this.buildHeaders(this.contextService.getContext().profile)
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
            this.axios.get(this.resolveUrl(url), {
                headers: this.buildHeaders(this.contextService.getContext().profile),
                responseType: "stream",
                validateStatus: status => status >= 200
            }).then(response => {
                const data: Buffer[] = [];
                response.data.on("data", (chunk: Buffer) => {
                    data.push(chunk);
                });
                response.data.on("end", () => {
                    if (response.status !== 200) {
                        reject(Buffer.concat(data).toString());
                        return;
                    }

                    this.handleResponseStreamData(Buffer.concat(data), resolve, reject);
                });
            }).catch(err => {
                this.handleError(err, resolve, reject);
            })
        });
    }

    public async postFile(url: string, formData: FormData, parameters?: {}): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.axios.post(
                this.resolveUrl(url),
                formData,
                {
                    headers: {
                        ...this.buildHeaders(this.contextService.getContext().profile, "multipart/form-data"),
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
            this.axios.post(
                this.resolveUrl(url),
                typeof body === "string" || body instanceof String ? body : JSON.stringify(body),
                {
                    headers: this.buildHeaders(this.contextService.getContext().profile, "application/json;charset=utf-8")
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
            this.axios.put(
                this.resolveUrl(url),
                JSON.stringify(body),
                {
                    headers: this.buildHeaders(this.contextService.getContext().profile, "application/json;charset=utf-8")
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
            this.axios.delete(this.resolveUrl(url), {
                headers: this.buildHeaders(this.contextService.getContext().profile, "application/json;charset=utf-8")
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
            this.axios.post(this.resolveUrl(url), null, {
                headers: this.buildHeaders(this.contextService.getContext().profile),
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

    private handleResponseStreamData(data: any, resolve: any, reject: any): void {
        if (data) {
            resolve(data);
            return;
        }

        logger.error("Could not get file stream from response");
        reject();
    }

    private resolveUrl(url: string): string {
        return this.contextService.getContext().profile.team.replace(/\/?$/, url);
    }

    private handleResponse(res: AxiosResponse, resolve: any, reject: any): void {
        if (this.checkBadRequest(res.status)) {
            this.handleBadRequest(res.status, res.data, reject);
            return;
        }
        resolve(res.data);
    }

    private handleError(err: any, resolve: any, reject: any): void {
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
    private handleBadRequest(statusCode: any, data: any, reject: any): void {
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