import * as path from "node:path";
import AdmZip = require("adm-zip");
import { Context } from "../command/cli-context";
import { CuiApi, CuiMarking, CuiPdfCoverResponse } from "./cui-api";
import { fileService } from "./file-service";
import { FileConstants } from "./file.constants";
import { FatalError } from "./logger";

export class CuiFileService {
    public static readonly COVER_SHEET_FILE_NAME = "CUI_Cover_Sheet.pdf";
    public static readonly CLASSIFIED_PREFIX = "CUI - ";

    private static readonly BASE64_ENCODING = "base64";

    private readonly cuiApi: CuiApi;

    constructor(context: Context) {
        this.cuiApi = new CuiApi(context);
    }

    public async writeToFileWithGivenName(data: string, filename: string): Promise<string> {
        return this.writeWithCoverHandling(
            name => fileService.writeToFileWithGivenName(data, name),
            filename,
            cover => this.writeClassifiedArchive(filename, data, cover)
        );
    }

    public async writeZipToFileWithGivenName(zipData: Buffer, filename: string): Promise<string> {
        return this.writeWithCoverHandling(
            name => fileService.writeBufferToFileWithGivenName(zipData, name),
            filename,
            cover => {
                const zip = new AdmZip(zipData);
                this.addCoverPage(zip, cover);

                return this.writeArchive(zip, filename);
            }
        );
    }

    public async writeDirectoryWithGivenName(write: (targetDir: string) => void, directoryName: string): Promise<string> {
        return this.writeWithCoverHandling(write, directoryName, cover => {
            const coverSheet = this.decodeCoverPage(cover);
            const classifiedName = this.prefixFileName(directoryName, CuiFileService.CLASSIFIED_PREFIX);

            write(classifiedName);
            fileService.writeBufferToFileWithGivenName(
                coverSheet,
                path.join(classifiedName, CuiFileService.COVER_SHEET_FILE_NAME)
            );

            return classifiedName;
        });
    }

    private async writeWithCoverHandling(
        write: (name: string) => void,
        filename: string,
        onClassified: (cover: CuiPdfCoverResponse) => string
    ): Promise<string> {
        const decision = await this.cuiApi.getCuiMarking();

        if (decision.marking === CuiMarking.DISABLED) {
            write(filename);
            return filename;
        }

        return onClassified(decision.cover);
    }

    private writeClassifiedArchive(filename: string, data: string, cover: CuiPdfCoverResponse): string {
        const zip = new AdmZip();
        zip.addFile(path.basename(filename), Buffer.from(data, "utf-8"), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        this.addCoverPage(zip, cover);

        return this.writeArchive(zip, filename);
    }

    private addCoverPage(zip: AdmZip, cover: CuiPdfCoverResponse): void {
        zip.addFile(
            CuiFileService.COVER_SHEET_FILE_NAME,
            this.decodeCoverPage(cover),
            "",
            FileConstants.DEFAULT_FILE_PERMISSIONS
        );
    }

    private writeArchive(zip: AdmZip, filename: string): string {
        const archiveName = this.buildClassifiedArchiveName(filename);
        fileService.writeBufferToFileWithGivenName(zip.toBuffer(), archiveName);

        return archiveName;
    }

    private decodeCoverPage(cover: CuiPdfCoverResponse): Buffer {
        const coverPage = cover.coverPage;
        if (!coverPage?.pdfContent) {
            throw new FatalError("CUI marking applies but the response contained no cover page.");
        }
        if (coverPage.encoding !== CuiFileService.BASE64_ENCODING) {
            throw new FatalError(`Unsupported CUI cover page encoding: ${coverPage.encoding}`);
        }

        return Buffer.from(coverPage.pdfContent, CuiFileService.BASE64_ENCODING);
    }

    private buildClassifiedArchiveName(filename: string): string {
        const baseName = path.basename(filename);
        const nameWithoutExtension = baseName.slice(0, baseName.length - path.extname(baseName).length);

        return path.join(path.dirname(filename), `${CuiFileService.CLASSIFIED_PREFIX}${nameWithoutExtension}.zip`);
    }

    private prefixFileName(filename: string, prefix: string): string {
        return path.join(path.dirname(filename), `${prefix}${path.basename(filename)}`);
    }
}
