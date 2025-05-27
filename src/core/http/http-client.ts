import {AxiosResponse, RawAxiosRequestHeaders} from "axios";
import * as FormData from "form-data";
import { Context } from "../command/cli-context";
import {AxiosInitializer} from "./axios-initializer";
import {FatalError, logger} from "../utils/logger";
import {TracingUtils} from "./tracing";
import {AuthenticationType, Profile} from "../profile/profile.interface";
import {VersionUtils} from "../utils/version";

/**
 * Http client configured based upon the CLI context. It will authenticate
 * based on the profile in the context and also use the base URL accordingly.
 */
export class HttpClient {
    
    private axios = AxiosInitializer.initializeAxios();

    constructor(private context: Context) {}

    public async get(url: string): Promise<any> {
        const fullUrl = this.resolveUrl(url);
        logger.debug(`HttpClient - GET ${fullUrl}`);
        return new Promise<any>((resolve, reject) => {
            this.axios.get(fullUrl, {
                headers: this.buildHeaders()
            }).then(response => {
                logger.debug(`Response ${response.status}`);
                this.handleResponse(response, resolve, reject);
            }).catch(err => {
                logger.debug(`HTTP GET resulted in error`, err);
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async getFile(url: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.axios.get(this.resolveUrl(url), {
                headers: this.buildHeaders(),
                responseType: "stream",
                validateStatus: status => status >= 200
            }).then(response => {
                const data: Buffer[] = [];
                response.data.on("data", (chunk: Buffer) => {
                    data.push(chunk);
                });
                response.data.on("end", () => {
                    if (response.status !== 200) {
                        reject(Buffer.concat(data as any).toString());
                        return;
                    }

                    this.handleResponseStreamData(Buffer.concat(data as any), resolve, reject);
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
                        ...this.buildHeaders("multipart/form-data"),
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
        const contentType = body instanceof FormData
            ? "multipart/form-data"
            : "application/json;charset=utf-8";
        const requestBody = typeof body === "string" || body instanceof String || body instanceof FormData
            ? body
            : JSON.stringify(body)
        return new Promise<any>((resolve, reject) => {
            this.axios.post(
                this.resolveUrl(url),
                requestBody,
                {
                    headers: this.buildHeaders(contentType)
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
                    headers: this.buildHeaders("application/json;charset=utf-8")
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
                headers: this.buildHeaders("application/json;charset=utf-8")
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
                headers: this.buildHeaders(),
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
                        this.handleResponseStreamData(Buffer.concat(data as any), resolve, reject);
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
        return this.context.profile.team.replace(/\/?$/, url);
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
            reject(err);
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

    private buildHeaders(contentType?: string): RawAxiosRequestHeaders {
        return {
            ...this.buildAuthorizationHeaders(this.context.profile, contentType),
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
