import { Profile } from "../../interfaces/profile.interface";
import { FatalError, logger } from "../../util/logger";
import { HttpClientService } from "../../services/http-client.service";
import * as fs from "fs";
import * as path from "path";
import { ManagerConfig } from "../../interfaces/manager-config.interface";

export abstract class BaseManager {
    private httpClientService = new HttpClientService();

    public get profile(): Profile {
        return this._profile;
    }

    public set profile(value: Profile) {
        this._profile = value;
    }

    private _profile: Profile;

    public async pull(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .buildRequestHeadersWithAuthentication(this._profile)
                .then(headers => {
                    return this.httpClientService.pullData(this.getConfig().pullUrl, headers);
                })
                .then(data => {
                    try {
                        const filename = this.writeToFile(data);
                        logger.info("File downloaded successfully. New filename: " + filename);
                        resolve();
                    } catch (e) {
                        logger.error(new FatalError(e));
                        reject();
                    }
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    public async pullFile(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .buildRequestHeadersWithAuthentication(this._profile)
                .then(headers => {
                    return this.httpClientService.pullFileData(this.getConfig().pullUrl, headers);
                })
                .then(data => {
                    const filename = this.writeStreamToFile(data);
                    logger.info("File downloaded successfully. New filename: " + filename);
                    resolve();
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    public async push(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .buildRequestHeadersWithAuthentication(this._profile)
                .then(headers => {
                    return this.httpClientService.pushData(this.getConfig().pushUrl, headers, this.getBody());
                })
                .then(data => {
                    logger.info(this.getConfig().onPushSuccessMessage(data));
                    resolve(data);
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    public async update(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .buildRequestHeadersWithAuthentication(this._profile)
                .then(headers => {
                    return this.httpClientService.updateData(this.getConfig().updateUrl, headers, this.getBody());
                })
                .then(data => {
                    logger.info(this.getConfig().onUpdateSuccessMessage());
                    resolve(data);
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    public async findAll(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .buildRequestHeadersWithAuthentication(this._profile)
                .then(headers => {
                    return this.httpClientService.findAll(this.getConfig().findAllUrl, headers);
                })
                .then(data => {
                    this.getConfig().onFindAll(data);
                    resolve(data);
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    protected writeToFile(data: any): string {
        const filename = this.getConfig().exportFileName;
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
        return filename;
    }

    protected writeStreamToFile(data: any): string {
        const filename = this.getConfig().exportFileName;
        fs.writeFileSync(filename, data);
        return filename;
    }

    protected abstract getConfig(): ManagerConfig;

    protected abstract getBody(): object;

    protected abstract getSerializedFileContent(data: any): string;
}
