import { HttpClient } from "../../core/http/http-client";
import { Context } from "../../core/command/cli-context";
import { FatalError, logger } from "../../core/utils/logger";
import { fileService, FileService } from "../../core/utils/file-service";
import { v4 as uuidv4 } from "uuid";

export class ApiService {
    private httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async request(path: string, method: string, body?: string, jsonFile?: boolean): Promise<void> {
        if (!path.startsWith("/")) {
            throw new FatalError("Path must start with /");
        }

        const validMethods = ["GET", "POST", "PUT", "DELETE"];
        if (!validMethods.includes(method)) {
            throw new FatalError(`Invalid method '${method}'. Must be one of: ${validMethods.join(", ")}`);
        }

        logger.info(`${method} ${path}`);

        let parsedBody: any;
        if (body) {
            try {
                parsedBody = JSON.parse(body);
            } catch {
                throw new FatalError("--body must be valid JSON");
            }
        }

        const data = await this.execute(method, path, parsedBody);

        if (jsonFile) {
            const filename = uuidv4() + ".json";
            fileService.writeToFileWithGivenName(JSON.stringify(data, null, 2), filename);
            logger.info(FileService.fileDownloadedMessage + filename);
        } else {
            const output = typeof data === "string" ? data : JSON.stringify(data, null, 2);
            logger.info(output);
        }
    }

    private async execute(method: string, path: string, body?: any): Promise<any> {
        try {
            switch (method) {
                case "GET":
                    return await this.httpClient().get(path);
                case "POST":
                    return await this.httpClient().post(path, body ?? {});
                case "PUT":
                    return await this.httpClient().put(path, body ?? {});
                case "DELETE":
                    return await this.httpClient().delete(path);
            }
        } catch (e) {
            throw new FatalError(`${method} ${path} failed: ${e}`);
        }
    }
}
