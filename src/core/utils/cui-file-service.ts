import * as path from "node:path";
import AdmZip = require("adm-zip");
import { Context } from "../command/cli-context";
import { CuiPdfCoverResponse, CuiService } from "./cui-service";
import { fileService } from "./file-service";
import { FileConstants } from "./file.constants";
import { FatalError } from "./logger";

export class CuiFileService {
    public static readonly COVER_SHEET_FILE_NAME = "CUI_Cover_Sheet.pdf";
    public static readonly CLASSIFIED_PREFIX = "CUI - ";
    public static readonly UNCLASSIFIED_PREFIX = "Unclassified - ";

    private static readonly BASE64_ENCODING = "base64";

    private readonly cuiService: CuiService;

    constructor(context: Context) {
        this.cuiService = new CuiService(context);
    }

    public async writeToFileWithGivenName(data: string, filename: string): Promise<string> {
        const cover = await this.cuiService.getCuiPdfCover();

        if (cover === null) {
            fileService.writeToFileWithGivenName(data, filename);
            return filename;
        }

        if (!this.isClassified(cover)) {
            const unclassifiedName = this.prefixFileName(filename, CuiFileService.UNCLASSIFIED_PREFIX);
            fileService.writeToFileWithGivenName(data, unclassifiedName);
            return unclassifiedName;
        }

        return this.writeClassifiedArchive(filename, data, cover);
    }

    private writeClassifiedArchive(filename: string, data: string, cover: CuiPdfCoverResponse): string {
        const zip = new AdmZip();
        zip.addFile(path.basename(filename), Buffer.from(data, "utf-8"), "", FileConstants.DEFAULT_FILE_PERMISSIONS);
        zip.addFile(
            CuiFileService.COVER_SHEET_FILE_NAME,
            this.decodeCoverPage(cover),
            "",
            FileConstants.DEFAULT_FILE_PERMISSIONS
        );

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

    private isClassified(cover: CuiPdfCoverResponse): boolean {
        return (cover.resolvedCuiMarking?.categories?.length ?? 0) > 0;
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
