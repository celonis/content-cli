import {GitProfileCommandService} from "../../../src/commands/git-profile/git-profile-command.service";
import {QuestionService} from "../../../src/core/utils/question.service";
import {AuthenticationType} from "../../../src/core/git-profile/git-profile.interface";
import {loggingTestTransport} from "../../jest.setup";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

jest.mock("fs");
jest.mock("os");
jest.mock("../../../src/core/utils/question.service");

describe("Git Profile - Create Profile", () => {
    let gitProfileCommandService: GitProfileCommandService;
    let mockQuestionAsk: jest.Mock;
    let mockQuestionClose: jest.Mock;
    const mockHomedir = "/mock/home";
    const mockProfilePath = path.resolve(mockHomedir, ".celonis-content-cli-git-profiles");

    beforeEach(() => {
        (os.homedir as jest.Mock).mockReturnValue(mockHomedir);

        mockQuestionAsk = jest.fn();
        mockQuestionClose = jest.fn().mockResolvedValue(undefined);

        (QuestionService as jest.Mock).mockImplementation(() => ({
            ask: mockQuestionAsk,
            close: mockQuestionClose,
        }));

        gitProfileCommandService = new GitProfileCommandService();

        jest.spyOn(process, "exit").mockImplementation((code?: number) => {
            return undefined as never;
        });
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        (fs.mkdirSync as jest.Mock).mockImplementation(() => void 0);
        (fs.writeFileSync as jest.Mock).mockImplementation(() => void 0);
        (fs.readFileSync as jest.Mock).mockImplementation(() => "{}");

        loggingTestTransport.logMessages = [];
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("Should create a Git profile with HTTPS authentication", async () => {
        const profileName = "test-profile";
        const username = "test-user";
        const repository = "owner/repo";
        const authenticationType = "1";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        await gitProfileCommandService.createProfile(false);

        expect(mockQuestionAsk).toHaveBeenCalledTimes(4);
        expect(mockQuestionAsk).toHaveBeenNthCalledWith(1, "Name of the Git profile to create: ");
        expect(mockQuestionAsk).toHaveBeenNthCalledWith(2, "Your Git username: ");
        expect(mockQuestionAsk).toHaveBeenNthCalledWith(3, "Your repository (format: repoOwner/repoName): ");
        expect(mockQuestionAsk).toHaveBeenNthCalledWith(4, "Authentication type: HTTPS (1), SSH token (2): ");

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, `${profileName}.json`),
            JSON.stringify({
                name: profileName,
                username: username,
                repository: repository,
                authenticationType: AuthenticationType.HTTPS,
            }),
            {encoding: "utf-8"}
        );

        expect(mockQuestionClose).toHaveBeenCalled();

        const loggedMessage = loggingTestTransport.logMessages[0].message.trim();
        expect(loggedMessage).toEqual("Git Profile created successfully!");
    });

    it("Should create a Git profile with SSH authentication", async () => {
        const profileName = "ssh-profile";
        const username = "ssh-user";
        const repository = "owner/repo";
        const authenticationType = "2";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        await gitProfileCommandService.createProfile(false);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, `${profileName}.json`),
            JSON.stringify({
                name: profileName,
                username: username,
                repository: repository,
                authenticationType: AuthenticationType.SSH,
            }),
            {encoding: "utf-8"}
        );

        const loggedMessage = loggingTestTransport.logMessages[0].message.trim();
        expect(loggedMessage).toEqual("Git Profile created successfully!");
    });

    it("Should create a Git profile and set it as default when setAsDefault is true", async () => {
        const profileName = "default-profile";
        const username = "default-user";
        const repository = "owner/repo";
        const authenticationType = "1";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        (fs.readFileSync as jest.Mock).mockReturnValue(
            JSON.stringify({
                name: profileName,
                username: username,
                repository: repository,
                authenticationType: AuthenticationType.HTTPS,
            })
        );

        await gitProfileCommandService.createProfile(true);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.resolve(mockProfilePath, `${profileName}.json`),
            expect.any(String),
            {encoding: "utf-8"}
        );

        const configPath = path.resolve(mockProfilePath, "config.json");
        expect(fs.writeFileSync).toHaveBeenCalledWith(configPath, JSON.stringify({defaultProfile: profileName}), {
            encoding: "utf-8",
        });

        const successMessage = loggingTestTransport.logMessages[1].message.trim();
        expect(successMessage).toEqual("Git Profile created successfully!");

        const defaultMessage = loggingTestTransport.logMessages[0].message.trim();
        expect(defaultMessage).toEqual("Default Git profile: " + profileName);
    });

    it("Should handle invalid authentication type", async () => {
        const profileName = "invalid-auth-profile";
        const username = "test-user";
        const repository = "owner/repo";
        const authenticationType = "3";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        await gitProfileCommandService.createProfile(false);

        const errorMessage = loggingTestTransport.logMessages[0];
        expect(errorMessage.level).toContain("error");
        expect(errorMessage.message.trim()).toContain("Invalid type");
        expect(mockQuestionClose).toHaveBeenCalled();

        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("Should handle invalid profile name validation error", async () => {
        const invalidProfileName = "invalid/profile*name";

        mockQuestionAsk.mockResolvedValueOnce(invalidProfileName);

        await gitProfileCommandService.createProfile(false);

        expect(fs.writeFileSync).not.toHaveBeenCalled();

        const loggedError = loggingTestTransport.logMessages[0];
        const loggedErrorMessage = loggedError.message.trim();
        const errorLevel = loggedError.level.trim();
        expect(loggedErrorMessage).toContain("Invalid profile name");
        expect(errorLevel).toContain("error");
        expect(mockQuestionClose).toHaveBeenCalled();
    });

    it("Should handle errors during profile creation", async () => {
        const profileName = "error-profile";
        const username = "error-user";
        const repository = "owner/repo";
        const authenticationType = "1";
        const errorMessage = "Storage error occurred";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        (fs.writeFileSync as jest.Mock).mockImplementation(() => {
            throw new Error(errorMessage);
        });

        await gitProfileCommandService.createProfile(false);

        const loggedError = loggingTestTransport.logMessages[0];
        expect(loggedError.level).toContain("error");
        expect(loggedError.message.trim()).toContain(errorMessage);
        expect(mockQuestionClose).toHaveBeenCalled();
    });

    it("Should ensure question service is closed even when an error occurs", async () => {
        mockQuestionAsk.mockRejectedValue(new Error("Question service error"));

        await gitProfileCommandService.createProfile(false);

        expect(mockQuestionClose).toHaveBeenCalled();
    });

    it("Should not call makeDefaultProfile when setAsDefault is false", async () => {
        const profileName = "no-default-profile";
        const username = "test-user";
        const repository = "owner/repo";
        const authenticationType = "1";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        await gitProfileCommandService.createProfile(false);

        const writeFileCallsCount = (fs.writeFileSync as jest.Mock).mock.calls.length;
        expect(writeFileCallsCount).toBe(1);

        const writeCalls = (fs.writeFileSync as jest.Mock).mock.calls;
        expect(writeCalls[0][0]).toContain(`${profileName}.json`);
        expect(writeCalls[0][0]).not.toContain("config.json");
    });

    it("Should create profile directory if it does not exist", async () => {
        const profileName = "test-profile";
        const username = "test-user";
        const repository = "owner/repo";
        const authenticationType = "1";

        mockQuestionAsk
            .mockResolvedValueOnce(profileName)
            .mockResolvedValueOnce(username)
            .mockResolvedValueOnce(repository)
            .mockResolvedValueOnce(authenticationType);

        (fs.existsSync as jest.Mock).mockReturnValue(false);

        await gitProfileCommandService.createProfile(false);

        expect(fs.mkdirSync).toHaveBeenCalledWith(mockProfilePath);
    });
});
