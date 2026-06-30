import * as fs from "node:fs";
import * as path from "node:path";
import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { ViewBookmarksCommandService } from "../../../src/commands/view/view-bookmarks-command.service";
import { ViewBookmarksManagerFactory } from "../../../src/commands/view/view-bookmarks.manager-factory";
import { loggingTestTransport } from "../../jest.setup";
import { testContext } from "../../utls/test-context";
import { getJsonFromDownloadedFile, writeJsonTempFile } from "../../utls/fs-utils";

describe("View bookmarks", () => {

    const rootNodeKey = "my-package";
    const key = "my-board";
    const keyParams = `rootNodeKey=${rootNodeKey}&key=${key}`;
    const exportBaseUrl = `https://myTeam.celonis.cloud/blueprint/api/bookmarks/export?${keyParams}`;
    const importUrl = `https://myTeam.celonis.cloud/blueprint/api/bookmarks/import?${keyParams}`;
    const bookmarksResponse = [
        {
            bookmark: { name: "My View Bookmark", ownerId: "user-1", userPreferenceId: "pref-1" },
            preference: { id: "pref-1", value: "{}" },
        },
    ];

    describe("pull", () => {
        it("Should call export API with the default USER type and write the response to a file", async () => {
            mockAxiosGet(`${exportBaseUrl}&type=USER`, bookmarksResponse);

            await new ViewBookmarksCommandService(testContext).pullViewBookmarks(rootNodeKey, key, undefined);

            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(`${exportBaseUrl}&type=USER`, expect.anything());
            expect(getJsonFromDownloadedFile()).toEqual(bookmarksResponse);
            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("File downloaded successfully. New filename: ");
        });

        it("Should call export API with the provided type", async () => {
            mockAxiosGet(`${exportBaseUrl}&type=SHARED`, bookmarksResponse);

            await new ViewBookmarksCommandService(testContext).pullViewBookmarks(rootNodeKey, key, "SHARED");

            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(`${exportBaseUrl}&type=SHARED`, expect.anything());
            expect(getJsonFromDownloadedFile()).toEqual(bookmarksResponse);
        });
    });

    describe("push", () => {
        it("Should call import API with the file as multipart body", async () => {
            mockAxiosPost(importUrl, {});
            writeJsonTempFile("bookmarks.json", bookmarksResponse);

            await new ViewBookmarksCommandService(testContext).pushViewBookmarks(rootNodeKey, key, "bookmarks.json");

            expect(mockedAxiosInstance.post).toHaveBeenCalledWith(importUrl, expect.anything(), expect.anything());
            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("View Bookmarks were pushed successfully.");
        });
    });

    describe("manager factory", () => {
        it("Should report a fatal error when the push file does not exist", () => {
            const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

            new ViewBookmarksManagerFactory(testContext).createViewBookmarksManager("missing.json", rootNodeKey, key);

            expect(exitSpy).toHaveBeenCalledWith(1);
        });
    });
});
