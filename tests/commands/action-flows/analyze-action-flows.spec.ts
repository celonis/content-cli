import * as path from "path";
import {mockedAxiosInstance} from "../../utls/http-requests-mock";
import {loggingTestTransport, mockWriteFileSync} from "../../jest.setup";
import {FileService} from "../../../src/core/utils/file-service";
import {ActionFlowCommandService} from "../../../src/commands/action-flows/action-flow/action-flow-command.service";
import {testContext} from "../../utls/test-context";

describe("Analyze action-flows", () => {
    const packageId = "123-456-789";
    const mockAnalyzeResponse = {
        actionFlows: [
            {
                key: "987_asset_key",
                rootNodeKey: "123_root_key_node",
                parentNodeKey: "555_parent_node_key",
                name: "T2T - simple package Automation",
                scenarioId: "321",
                webHookUrl: null,
                version: "10",
                sensorType: null,
                schedule: {
                    type: "indefinitely",
                    interval: 900,
                },
                teamSpecific: {
                    connections: [],
                    variables: [],
                    celonisApps: [],
                    callingOtherAf: [],
                    datastructures: [],
                },
            },
        ],
        connections: [],
        dataPools: [],
        dataModels: [],
        skills: [],
        analyses: [],
        datastructures: [],
        mappings: [],
        actionFlowsTeamId: "1234",
    };

    it("Should call import API and return non-json response", async () => {
        const resp = {data: mockAnalyzeResponse};
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValue(resp);

        await new ActionFlowCommandService(testContext).analyzeActionFlows(packageId, false);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(JSON.stringify(mockAnalyzeResponse, null, 4));

        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
            `https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/export/assets/analyze`,
            expect.anything()
        );
    });

    it("Should call import API and return json response", async () => {
        const resp = {data: mockAnalyzeResponse};
        (mockedAxiosInstance.get as jest.Mock).mockResolvedValue(resp);

        await new ActionFlowCommandService(testContext).analyzeActionFlows(packageId, true);

        expect(loggingTestTransport.logMessages.length).toBe(1);
        expect(loggingTestTransport.logMessages[0].message).toContain(FileService.fileDownloadedMessage);
        const expectedFileName = loggingTestTransport.logMessages[0].message.split(
            FileService.fileDownloadedMessage
        )[1];

        expect(mockWriteFileSync).toHaveBeenCalledWith(
            path.resolve(process.cwd(), expectedFileName),
            JSON.stringify(mockAnalyzeResponse, null, 4),
            {encoding: "utf-8"}
        );
        expect(mockedAxiosInstance.get).toHaveBeenCalledWith(
            `https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/export/assets/analyze`,
            expect.anything()
        );
    });
});
