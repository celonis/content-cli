import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../utils/logger";
import { ManagerConfig } from "./manager-config.interface";
import { HttpClient } from "../http-client";
import { Context } from "../../command/cli-context";

export abstract class BaseManager {
    private httpClient: HttpClient;
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    protected constructor(context: Context) {
        this.httpClient = context.httpClient;
    }

    public async pull(): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this.httpClient
                .get(this.getConfig().pullUrl)
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
        return new Promise<void>((resolve, reject) => {
            this.httpClient
                .downloadFile(this.getConfig().pullUrl)
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
            this.httpClient
                .post(this.getConfig().pushUrl, this.getBody())
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
            this.httpClient
                .put(this.getConfig().updateUrl, this.getBody())
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
            this.httpClient
                .get(this.getConfig().findAllUrl)
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
