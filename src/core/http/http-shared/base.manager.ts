import * as fs from "fs";
import * as path from "path";
import { FatalError, logger } from "../../utils/logger";
import { ManagerConfig } from "./manager-config.interface";
import { HttpClient } from "../http-client";
import { Context } from "../../command/cli-context";
import { FileConstants } from "../../utils/file.constants";
import { CuiFileService } from "../../utils/cui-file-service";

export abstract class BaseManager {
    private httpClient: () => HttpClient;
    protected readonly cuiFileService: CuiFileService;
    protected readonly fileDownloadedMessage = "File downloaded successfully. New filename: ";

    protected constructor(context: Context) {
        this.httpClient = () => context.httpClient;
        this.cuiFileService = new CuiFileService(context);
    }

    public async pull(): Promise<any> {
        return new Promise<void>((resolve, reject) => {
            this.httpClient()
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
        try {
            const data = await this.httpClient().downloadFile(this.getConfig().pullUrl);
            const filename = await this.writeStreamToFile(data);
            logger.info(this.fileDownloadedMessage + filename);
        } catch (err) {
            logger.error(new FatalError(err));
            throw err;
        }
    }

    public async push(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClient()
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
            this.httpClient()
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
        try {
            const data = await this.httpClient().get(this.getConfig().findAllUrl);
            await this.getConfig().onFindAll(data);
            return data;
        } catch (err) {
            logger.error(new FatalError(err));
            throw err;
        }
    }

    protected writeToFile(data: any): string {
        const filename = this.getConfig().exportFileName;
        this.writeToFileWithGivenName(data, filename);
        return filename;
    }

    protected async writeStreamToFile(data: Buffer): Promise<string> {
        return this.cuiFileService.writeZipToFileWithGivenName(data, this.getConfig().exportFileName);
    }

    protected writeToFileWithGivenName(data: any, filename: string): void {
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
            mode: FileConstants.DEFAULT_FILE_PERMISSIONS,
        });
    }

    protected abstract getConfig(): ManagerConfig;

    protected abstract getBody(): object;

    protected abstract getSerializedFileContent(data: any): string;
}
