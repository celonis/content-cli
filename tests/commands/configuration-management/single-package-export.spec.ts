import * as path from "path";
import AdmZip = require("adm-zip");
import { mockAxiosGet, mockAxiosGetError, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { SinglePackageExportService } from "../../../src/commands/configuration-management/single-package-export.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";

const PACKAGE_KEY = "pkg-1";
const EXPORT_URL = `https://myTeam.celonis.cloud/pacman/api/core/staging/packages/${PACKAGE_KEY}/export-file`;

function buildSinglePackageZip(): Buffer {
    const zip = new AdmZip();
    zip.addFile("package.json", Buffer.from(JSON.stringify({
        key: PACKAGE_KEY,
        name: "My Package",
        type: "PACKAGE",
        flavor: "STUDIO",
        schemaVersion: 1,
        configuration: { variables: [] },
    })));
    zip.addFile("variables.json", Buffer.from(JSON.stringify([])));
    zip.addFile("nodes/", Buffer.alloc(0));
    zip.addFile("nodes/node-1.json", Buffer.from(JSON.stringify({ key: "node-1", type: "VIEW" })));
    return zip.toBuffer();
}

describe("Single package export", () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("Should export the package unzipped into a <packageKey> directory by default", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        const extractSpy = jest.spyOn(FileService.prototype, "extractZipBufferToDirectory").mockImplementation(() => undefined);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false);

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(EXPORT_URL, expect.anything());
        expect(extractSpy).toHaveBeenCalledTimes(1);
        const [extractedData, extractedDir] = extractSpy.mock.calls[0];
        expect((extractedData as Buffer).equals(packageData)).toBe(true);
        expect(extractedDir).toEqual(PACKAGE_KEY);
        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(loggingTestTransport.logMessages[0].message).toContain(`Successful export. Exported directory: ${PACKAGE_KEY}`);
    });

    it("Should export the package as <packageKey>.zip when --zip is set", async () => {
        const packageData = buildSinglePackageZip();
        mockAxiosGet(EXPORT_URL, packageData);

        await new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, true);

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(EXPORT_URL, expect.anything());

        const [writtenPath, writtenData, writtenOptions] = mockWriteFileSync.mock.calls[0];
        expect(writtenPath).toEqual(path.resolve(process.cwd(), `${PACKAGE_KEY}.zip`));
        expect((writtenData as Buffer).equals(packageData)).toBe(true);
        expect(writtenOptions).toEqual({ mode: 0o600 });
        expect(loggingTestTransport.logMessages[0].message).toContain(`${FileService.fileDownloadedMessage}${PACKAGE_KEY}.zip`);
    });

    it("Should surface a fatal error when the export endpoint returns an error", async () => {
        mockAxiosGetError(EXPORT_URL, 404, { errorCode: "PACKAGE_NOT_FOUND" });

        await expect(
            new SinglePackageExportService(testContext).exportPackage(PACKAGE_KEY, false)
        ).rejects.toThrow(`Problem exporting package ${PACKAGE_KEY}`);

        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
});
