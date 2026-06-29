import { PackageManager } from "../../../src/commands/studio/manager/package.manager";
import { loggingTestTransport } from "../../jest.setup";
import { testContext } from "../../utls/test-context";

describe("PackageManager", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("exits with code 1 when overwrite and new key are used together", () => {
        const exitSignal = new Error("process.exit(1)");
        const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => {
            throw exitSignal;
        }) as never);
        loggingTestTransport.logMessages = [];

        const manager = new PackageManager(testContext);
        manager.spaceKey = "space-id";
        manager.key = "my-package";
        manager.newKey = "renamed-package";
        manager.overwrite = true;
        manager.store = false;
        manager.draft = false;

        expect(() => manager.getConfig()).toThrow(exitSignal);

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(
            loggingTestTransport.logMessages.some(entry =>
                String(entry.message).includes("You cannot overwrite a package and set a new key at the same time")
            )
        ).toBe(true);
    });
});
