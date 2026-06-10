import * as fs from "fs";
import * as path from "path";
import { mockAxiosGet, mockAxiosPost, mockedAxiosInstance } from "../../utls/http-requests-mock";
import { mockCreateReadStream, mockExistsSync } from "../../utls/fs-mock-utils";
import { ViewBookmarksCommandService } from "../../../src/commands/view/view-bookmarks-command.service";
import { ViewBookmarksManagerFactory } from "../../../src/commands/view/view-bookmarks.manager-factory";
import { loggingTestTransport, mockWriteFileSync } from "../../jest.setup";
import { testContext } from "../../utls/test-context";

describe("View bookmarks", () => {

    const boardId = "73d39112-73ae-4bbe-8051-3c0f14e065ec";
    const exportBaseUrl = `https://myTeam.celonis.cloud/blueprint/api/bookmarks/export?boardId=${boardId}`;
    const importUrl = `https://myTeam.celonis.cloud/blueprint/api/bookmarks/import?boardId=${boardId}`;
    const bookmarksResponse = [
        {
            bookmark: { name: "My View Bookmark", ownerId: "user-1", userPreferenceId: "pref-1" },
            preference: { id: "pref-1", value: "{}" },
        },
    ];

    describe("pull", () => {
        it("Should call export API with the default USER type and write the response to a file", async () => {
            mockAxiosGet(`${exportBaseUrl}&type=USER`, bookmarksResponse);

            await new ViewBookmarksCommandService(testContext).pullViewBookmarks(boardId, undefined);

            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(`${exportBaseUrl}&type=USER`, expect.anything());
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), `studio_view_bookmarks_${boardId}.json`),
                JSON.stringify(bookmarksResponse),
                { encoding: "utf-8", mode: 0o600 }
            );
            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("File downloaded successfully. New filename: ");
        });

        it("Should call export API with the provided type", async () => {
            mockAxiosGet(`${exportBaseUrl}&type=SHARED`, bookmarksResponse);

            await new ViewBookmarksCommandService(testContext).pullViewBookmarks(boardId, "SHARED");

            expect(mockedAxiosInstance.get).toHaveBeenCalledWith(`${exportBaseUrl}&type=SHARED`, expect.anything());
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                path.resolve(process.cwd(), `studio_view_bookmarks_${boardId}.json`),
                JSON.stringify(bookmarksResponse),
                { encoding: "utf-8", mode: 0o600 }
            );
        });
    });

    describe("push", () => {
        it("Should call import API with the file as multipart body", async () => {
            mockAxiosPost(importUrl, {});
            mockExistsSync();
            mockCreateReadStream(Buffer.from(JSON.stringify(bookmarksResponse)));

            await new ViewBookmarksCommandService(testContext).pushViewBookmarks(boardId, "bookmarks.json");

            expect(mockedAxiosInstance.post).toHaveBeenCalledWith(importUrl, expect.anything(), expect.anything());
            expect(loggingTestTransport.logMessages.length).toBe(1);
            expect(loggingTestTransport.logMessages[0].message).toContain("View Bookmarks were pushed successfully.");
        });
    });

    describe("manager factory", () => {
        it("Should report a fatal error when the push file does not exist", () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);

            new ViewBookmarksManagerFactory(testContext).createViewBookmarksManager("missing.json", boardId);

            expect(exitSpy).toHaveBeenCalledWith(1);
        });
    });
});
