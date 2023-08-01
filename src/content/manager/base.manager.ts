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

    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    public async pull(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .pullData(this.getConfig().pullUrl, this._profile)
                .then(data => {
                    try {
                        const filename = this.writeToFile(data);
                        logger.info(this.fileDownloadedMessage + filename);
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
                .pullFileData(this.getConfig().pullUrl, this._profile)
                .then(data => {
                    const filename = this.writeStreamToFile(data);
                    logger.info(this.fileDownloadedMessage + filename);
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
                .pushData(this.getConfig().pushUrl, this._profile, this.getBody())
                .then(data => {
                    const config = this.getConfig();
                    if (data) {
                        this.writeToFileWithGivenName(data, config.pushReportFileName);
                    }
                    logger.info(config.onPushSuccessMessage(data));
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
                .updateData(this.getConfig().updateUrl, this._profile, this.getBody())
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
                .findAll(this.getConfig().findAllUrl, this._profile)
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
        this.writeToFileWithGivenName(data, filename);
        return filename;
    }

    protected writeStreamToFile(data: any): string {
        const filename = this.getConfig().exportFileName;
        fs.writeFileSync(filename, data);
        return filename;
    }

    protected writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
    }

    protected abstract getConfig(): ManagerConfig;

    protected abstract getBody(): object;

    protected abstract getSerializedFileContent(data: any): string;
}
