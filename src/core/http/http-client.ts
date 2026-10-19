import {AxiosResponse, RawAxiosRequestHeaders, isAxiosError} from "axios";
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

    /** Raw authenticated transport for APIs that require binary bodies and custom headers. */
    public async requestRaw(
        method: "GET" | "POST" | "PUT",
        url: string,
        body?: Buffer | object,
        headers: RawAxiosRequestHeaders = {},
        maxBodyLength = 16 * 1024 * 1024,
    ): Promise<{ status: number; data: unknown }> {
        const origin = new URL(this.context.profile.team);
        const target = new URL(url, origin);
        if (!url.startsWith("/") || target.origin !== origin.origin || target.search || target.hash) {
            throw new Error("Expected an API path on the profile's tenant origin.");
        }
        try {
            const response = await this.axios.request<unknown>({
                method,
                url: target.href,
                data: body,
                headers: { ...this.buildHeaders(), ...headers },
                timeout: 120000,
                maxRedirects: 0,
                maxBodyLength,
                maxContentLength: 4 * 1024 * 1024,
                validateStatus: () => true,
            });
            return { status: response.status, data: response.data };
        } catch (error) {
            // Never expose Axios errors: their config contains the Authorization header.
            const code = isAxiosError(error) ? error.code : undefined;
            throw new Error(code === "ECONNABORTED" ? "Fragment request timed out." : "Fragment request failed in transport.");
        }
    }

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
                logger.debug("HTTP GET resulted in error", err);
                this.handleError(err, resolve, reject);
            })
        }).catch(e => {
            throw new FatalError(e);
        })
    }

    public async getStatusAndData(url: string): Promise<{ status: number; data: any }> {
        const fullUrl = this.resolveUrl(url);
        logger.debug(`HttpClient - GET ${fullUrl}`);
        return this.axios.get(fullUrl, {
            headers: this.buildHeaders(),
            validateStatus: () => true,
        }).then(response => {
            logger.debug(`Response ${response.status}`);
            return { status: response.status, data: response.data };
        }).catch(err => {
            if (err.response) {
                return { status: err.response.status, data: err.response.data };
            }
            throw new FatalError(err);
        });
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
                responseType: "stream",
                validateStatus: () => true, // Accept all status codes, handle manually
            }).then(response => {
                if (this.checkBadRequest(response.status)) {
                    // For error responses, collect as text for readable error messages
                    let errorData = '';
                    response.data.setEncoding('utf8');
                    response.data.on('data', (chunk: string) => {
                        errorData += chunk;
                    });
                    response.data.on('end', () => {
                        this.handleBadRequest(response.status, errorData, reject);
                    });
                    response.data.on('error', (err: any) => {
                        reject(`Error reading error response: ${err.message}`);
                    });
                } else {
                    // For successful responses, collect as binary for file download
                    const data: Buffer[] = [];
                    response.data.on("data", (chunk: Buffer) => {
                        data.push(chunk);
                    });
                    response.data.on("end", () => {
                        this.handleResponseStreamData(Buffer.concat(data as any), resolve, reject);
                    });
                    response.data.on('error', (err: any) => {
                        reject(`Error reading file data: ${err.message}`);
                    });
                }
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
        return this.context.profile.team.replace(/\/?$/, url);
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
            reject(err);
        }
    }

    private checkBadRequest(statusCode: number): boolean {
        return statusCode >= 400;
    }

    // tslint:disable-next-line:typedef
    private handleBadRequest(statusCode: number, data: any, reject: any): void {
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
        const headers: RawAxiosRequestHeaders = {
            "Content-Type": contentType ?? "application/json",
        };
        if (profile.apiToken) {
            const authenticationType = profile.authenticationType || AuthenticationType.BEARER;
            headers.Authorization = `${authenticationType} ${profile.apiToken}`;
        }
        return headers;
    }
}
