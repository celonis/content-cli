import { mockAxiosGet, mockAxiosGetError, mockAxiosGetWithStatus } from "../../../utls/http-requests-mock";
import { PointerCommandService } from "../../../../src/commands/configuration-management/pointer/pointer.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile } from "../../../utls/fs-utils";
import { PackagePointerTransport } from "../../../../src/commands/configuration-management/pointer/interfaces/pointer.interfaces";

describe("pointer get", () => {
    const packageKey = "my-package";
    const branchPackageKey = `${packageKey}@release-branch`;
    const apiUrl = `https://myTeam.celonis.cloud/pacman/api/core/pointers/packages/${packageKey}`;

    const pointer: PackagePointerTransport = {
        packageKey,
        pointerName: "LIVE",
        branchPackageKey,
        updatedBy: "someone",
        updatedAt: "2026-08-28T10:00:00Z",
    };

    const logged = (fragment: string): boolean =>
        loggingTestTransport.logMessages.some(message => message.message.includes(fragment));

    it("prints the LIVE branch", async () => {
        mockAxiosGet(apiUrl, pointer);

        const result = await new PointerCommandService(testContext).getLive(packageKey, false);

        expect(result).toEqual(pointer);
        expect(logged(`Branch Package Key: ${branchPackageKey}`)).toBe(true);
    });

    it("reports no selection instead of an empty object when the backend answers 404", async () => {
        const backendMessage = `Package pointer 'LIVE' not found for package '${packageKey}'`;
        mockAxiosGetError(apiUrl, 404, { message: backendMessage });

        const result = await new PointerCommandService(testContext).getLive(packageKey, false);

        expect(result).toBeNull();
        expect(logged(`No LIVE selection for ${packageKey}.`)).toBe(true);
        expect(logged(backendMessage)).toBe(true);
    });

    it("reports no selection when the backend answers 204", async () => {
        mockAxiosGetWithStatus(apiUrl, 204, "");

        const result = await new PointerCommandService(testContext).getLive(packageKey, false);

        expect(result).toBeNull();
        expect(logged(`No LIVE selection for ${packageKey}.`)).toBe(true);
    });

    it("writes the pointer to a JSON file when jsonResponse=true", async () => {
        mockAxiosGet(apiUrl, pointer);

        await new PointerCommandService(testContext).getLive(packageKey, true);

        expect(getJsonFromDownloadedFile()).toEqual(pointer);
    });

    it("names both causes of an empty 403 without choosing between them", async () => {
        mockAxiosGetError(apiUrl, 403, "");

        await expect(new PointerCommandService(testContext).getLive(packageKey, false)).rejects.toThrow(
            /pacman\.live-branch-pointer/
        );
    });

    it("rejects a branch package key in --packageKey before calling the backend", async () => {
        await expect(new PointerCommandService(testContext).getLive(branchPackageKey, false)).rejects.toThrow(
            /--packageKey must be the main package key/
        );
    });
});
