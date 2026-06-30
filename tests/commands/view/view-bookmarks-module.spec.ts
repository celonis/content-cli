import Module = require("../../../src/commands/view/module");
import { Command, OptionValues } from "commander";
import { ViewBookmarksCommandService } from "../../../src/commands/view/view-bookmarks-command.service";
import { testContext } from "../../utls/test-context";
import { createMockConfigurator } from "../../utls/configurator-mock";

jest.mock("../../../src/commands/view/view-bookmarks-command.service");

describe("View Bookmarks Module", () => {
    let module: Module;
    let mockCommand: Command;
    let mockService: jest.Mocked<ViewBookmarksCommandService>;

    beforeEach(() => {
        jest.clearAllMocks();
        module = new Module();
        mockCommand = {} as Command;

        mockService = {
            pullViewBookmarks: jest.fn().mockResolvedValue(undefined),
            pushViewBookmarks: jest.fn().mockResolvedValue(undefined),
        } as any;

        (ViewBookmarksCommandService as jest.MockedClass<typeof ViewBookmarksCommandService>)
            .mockImplementation(() => mockService);
    });

    it("should call pullViewBookmarks with rootNodeKey, key and type", async () => {
        const options: OptionValues = { rootNodeKey: "my-package", key: "my-board", type: "SHARED" };
        await (module as any).pullViewBookmarks(testContext, mockCommand, options);
        expect(mockService.pullViewBookmarks).toHaveBeenCalledWith("my-package", "my-board", "SHARED");
    });

    it("should call pushViewBookmarks with rootNodeKey, key and file", async () => {
        const options: OptionValues = { rootNodeKey: "my-package", key: "my-board", file: "bookmarks.json" };
        await (module as any).pushViewBookmarks(testContext, mockCommand, options);
        expect(mockService.pushViewBookmarks).toHaveBeenCalledWith("my-package", "my-board", "bookmarks.json");
    });

    describe("register", () => {
        it("registers the pull and push command groups without throwing", () => {
            const mockConfigurator = createMockConfigurator();

            expect(() => new Module().register(testContext, mockConfigurator)).not.toThrow();

            expect(mockConfigurator.command).toHaveBeenCalledWith("pull");
            expect(mockConfigurator.command).toHaveBeenCalledWith("push");
        });

        it("wires an action handler for every leaf subcommand", () => {
            const mockConfigurator = createMockConfigurator();

            new Module().register(testContext, mockConfigurator);

            // pull view-bookmarks + push view-bookmarks
            const expectedLeafCommands = 2;
            expect(mockConfigurator.action).toHaveBeenCalledTimes(expectedLeafCommands);
            for (const call of mockConfigurator.action.mock.calls) {
                expect(typeof call[0]).toBe("function");
            }
        });
    });
});
