import { Profile } from "../../interfaces/profile.interface";
import { FatalError, logger } from "../../util/logger";
import { HttpClientService } from "../../services/http-client.service";
import * as fs from "fs";
import * as path from "path";

export abstract class BaseManager {
    private httpClientService = new HttpClientService();

    get profile(): Profile {
        return this._profile;
    }

    set profile(value: Profile) {
        this._profile = value;
    }

    private _profile: Profile;

    public async pull(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .pullData(this.getPullUrl(), this._profile)
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

    public async push(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.httpClientService
                .pushData(this.getPushUrl(), this._profile, this.getBody())
                .then(data => {
                    logger.info(this.getSuccessPushMessage(data));
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
                .updateData(this.getUpdateUrl(), this._profile, this.getBody())
                .then(data => {
                    logger.info(this.getSuccessUpdateMessage());
                    resolve(data);
                })
                .catch(err => {
                    logger.error(new FatalError(err));
                    reject();
                });
        });
    }

    protected writeToFile(data: any): string {
        const filename = this.getExportFileName();
        fs.writeFileSync(path.resolve(process.cwd(), filename), this.getSerializedFileContent(data), {
            encoding: "utf-8",
        });
        return filename;
    }

    protected abstract getExportFileName(): string;

    protected abstract getPushUrl(): string;

    protected abstract getPullUrl(): string;

    protected abstract getUpdateUrl(): string;

    protected abstract getBody(): any;

    protected abstract getSuccessPushMessage(data: any): string;

    protected abstract getSuccessUpdateMessage(): string;

    protected abstract getSerializedFileContent(data: any): string;
}
