import { BaseManager } from "../../../src/core/http/http-shared/base.manager";
import { ManagerConfig } from "../../../src/core/http/http-shared/manager-config.interface";
import { FatalError } from "../../../src/core/utils/logger";
import { loggingTestTransport } from "../../jest.setup";
import { mockAxiosGetError, mockAxiosPostError } from "../../utls/http-requests-mock";
import { testContext } from "../../utls/test-context";

const TEAM_URL = "https://myTeam.celonis.cloud";
const PULL_PATH = "/api/test/pull";
const PUSH_PATH = "/api/test/push";
const FIND_ALL_PATH = "/api/test/find-all";
const ERROR_BODY = { message: "Internal Server Error" };

class TestManager extends BaseManager {
    public constructor() {
        super(testContext);
    }

    protected getConfig(): ManagerConfig {
        return {
            pullUrl: PULL_PATH,
            pushUrl: PUSH_PATH,
            findAllUrl: FIND_ALL_PATH,
            exportFileName: "test-export.json",
            onPushSuccessMessage: () => "Pushed successfully",
            onFindAll: () => undefined,
        };
    }

    protected getBody(): object {
        return { key: "test" };
    }

    protected getSerializedFileContent(data: any): string {
        return JSON.stringify(data);
    }
}

describe("BaseManager error handling", () => {

    let manager: TestManager;
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
        manager = new TestManager();
        exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
        exitSpy.mockRestore();
    });

    const expectFatalErrorLogged = (): void => {
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Internal Server Error");
    };

    it("Should log a fatal error and reject when the pull API fails", async () => {
        mockAxiosGetError(TEAM_URL + PULL_PATH, 500, ERROR_BODY);

        await expect(manager.pull()).rejects.toThrow(FatalError);

        expectFatalErrorLogged();
    });

    it("Should log a fatal error and reject when the file download fails", async () => {
        mockAxiosPostError(TEAM_URL + PULL_PATH, 500, ERROR_BODY);

        await expect(manager.pullFile()).rejects.toEqual(JSON.stringify(ERROR_BODY));

        expectFatalErrorLogged();
    });

    it("Should log a fatal error and reject when the push API fails", async () => {
        mockAxiosPostError(TEAM_URL + PUSH_PATH, 500, ERROR_BODY);

        await expect(manager.push()).rejects.toBeUndefined();

        expectFatalErrorLogged();
    });

    it("Should log a fatal error and reject when the find all API fails", async () => {
        mockAxiosGetError(TEAM_URL + FIND_ALL_PATH, 500, ERROR_BODY);

        await expect(manager.findAll()).rejects.toThrow(FatalError);

        expectFatalErrorLogged();
    });
});
