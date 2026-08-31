import { mockAxiosPut, mockAxiosPutError, mockedPostRequestBodyByUrl } from "../../../utls/http-requests-mock";
import { PointerCommandService } from "../../../../src/commands/configuration-management/pointer/pointer.command.service";
import { testContext } from "../../../utls/test-context";
import { loggingTestTransport } from "../../../jest.setup";
import { getJsonFromDownloadedFile } from "../../../utls/fs-utils";
import {
    PackagePointerTransport,
    SetPackagePointerTransport,
} from "../../../../src/commands/configuration-management/pointer/interfaces/pointer.interfaces";

describe("pointer set", () => {
    const packageKey = "my-package";
    const branchKey = "release-branch";
    const branchPackageKey = `${packageKey}@${branchKey}`;
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

    it("selects the branch as LIVE and prints the resulting pointer", async () => {
        mockAxiosPut(apiUrl, pointer);

        await new PointerCommandService(testContext).setLive(packageKey, branchKey, false);

        const requestBody: SetPackagePointerTransport = JSON.parse(mockedPostRequestBodyByUrl.get(apiUrl) as string);
        expect(requestBody).toEqual({ branchPackageKey });
        expect(logged(`Branch Package Key: ${branchPackageKey}`)).toBe(true);
    });

    it("sends no validate query parameter, which the backend would ignore while still releasing", async () => {
        mockAxiosPut(apiUrl, pointer);

        await new PointerCommandService(testContext).setLive(packageKey, branchKey, false);

        expect([...mockedPostRequestBodyByUrl.keys()]).toEqual([apiUrl]);
    });

    it("writes the pointer to a JSON file when jsonResponse=true", async () => {
        mockAxiosPut(apiUrl, pointer);

        await new PointerCommandService(testContext).setLive(packageKey, branchKey, true);

        expect(getJsonFromDownloadedFile()).toEqual(pointer);
    });

    it("confirms the selection when the backend answers without a body", async () => {
        mockAxiosPut(apiUrl, undefined);

        await new PointerCommandService(testContext).setLive(packageKey, branchKey, false);

        expect(logged(`${branchPackageKey} is now LIVE for ${packageKey}.`)).toBe(true);
    });

    it("reports blocking problems and the validate follow-up on 409", async () => {
        mockAxiosPutError(apiUrl, 409, {
            message: "The branch has 2 blocking problems.",
            details: [{ errorCode: "package-pointer-blocking-problems" }],
        });

        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.toThrow(
            /package-pointer-blocking-problems/
        );
        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.toThrow(
            new RegExp(`config package validate --packageKey ${branchPackageKey}`)
        );
    });

    it("passes a conflict that is not about blocking problems through unchanged", async () => {
        mockAxiosPutError(apiUrl, 409, { message: "Something else conflicted.", details: [{ errorCode: "other" }] });

        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.toThrow(
            /Something else conflicted/
        );
        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.not.toThrow(
            /config package validate/
        );
    });

    it("names both causes of an empty 403 without choosing between them", async () => {
        mockAxiosPutError(apiUrl, 403, "");

        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.toThrow(
            /pacman\.live-branch-pointer/
        );
        await expect(new PointerCommandService(testContext).setLive(packageKey, branchKey, false)).rejects.toThrow(
            /may not edit the package/
        );
    });

    it("rejects a branch package key in --packageKey before calling the backend", async () => {
        await expect(new PointerCommandService(testContext).setLive(branchPackageKey, branchKey, false)).rejects.toThrow(
            /--packageKey must be the main package key/
        );
    });

    it("rejects selecting main as LIVE", async () => {
        await expect(new PointerCommandService(testContext).setLive(packageKey, "main", false)).rejects.toThrow(
            /cannot be selected as LIVE/
        );
    });
});
