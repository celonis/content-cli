import * as AdmZip from "adm-zip";
import * as fs from "fs";
import { parse, stringify } from "yaml";
import { mockAxiosGet } from "../../utls/http-requests-mock";
import { ActionFlowCommandService } from "../../../src/commands/action-flows/action-flow/action-flow-command.service";
import { loggingTestTransport, mockWriteSync } from "../../jest.setup";
import { FileService } from "../../../src/core/utils/file-service";
import { mockExistsSyncOnce, mockReadFileSync } from "../../utls/fs-mock-utils";
import { ActionFlowService } from "../../../src/commands/action-flows/action-flow/action-flow.service";
import { testContext } from "../../utls/test-context";

describe("Export action-flows", () => {
  const packageId = "123-456-789";
  const actionFlowFileName = "20240711-scenario-1234.json";
  const actionFlowConfig = {
    name: "T2T - simple package Automation",
    flow: [
      {
        id: 6,
        module: "util:FunctionSleep",
        version: 1,
        parameters: {},
        metadata: {
          expect: [
            {
              name: "duration",
              type: "uinteger",
              label: "Delay",
              required: true,
              validate: {
                max: 300,
                min: 1,
              },
            },
          ],
          restore: {},
          designer: {
            x: 300,
            y: 0,
          },
        },
        mapper: {
          duration: "1",
        },
      },
    ],
    metadata: {
      instant: false,
      version: 1,
      designer: {
        orphans: [],
      },
      scenario: {
        dlq: false,
        dataloss: false,
        maxErrors: 3,
        autoCommit: true,
        roundtrips: 1,
        sequential: false,
        confidential: false,
        freshVariables: false,
        autoCommitTriggerLast: true,
      },
    },
    io: {
      output_spec: [],
      input_spec: [],
    },
  };

  beforeEach(() => {
    (fs.openSync as jest.Mock).mockReturnValue(100);
  });

  it("Should call export API and return the zip response", async () => {
    const zipExport = new AdmZip();
    zipExport.addFile(
      actionFlowFileName,
      Buffer.from(stringify(actionFlowConfig)),
    );

    mockAxiosGet(
      `https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/export/assets`,
      zipExport.toBuffer(),
    );

    await new ActionFlowCommandService(testContext).exportActionFlows(
      packageId,
      null,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    const expectedZipFileName =
      loggingTestTransport.logMessages[0].message.split(
        FileService.fileDownloadedMessage,
      )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedZipFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const receivedZip = new AdmZip(fileBuffer);

    expect(receivedZip.getEntries().length).toBe(1);
    const receivedZipEntry = receivedZip.getEntries()[0];
    const receivedActionFlowConfig = parse(
      receivedZipEntry.getData().toString(),
    );
    expect(receivedZipEntry.name).toEqual(actionFlowFileName);
    expect(receivedActionFlowConfig).toEqual(actionFlowConfig);
  });

  it("Should call export API and attach the provided file to the zip response", async () => {
    const metadata = {
      actionFlows: [
        {
          key: "123_asset_key",
          rootNodeKey: "543_root_key",
          parentNodeKey: "9099_parent_key",
          name: "T2T - simple package Automation",
          scenarioId: "1234",
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
      actionFlowsTeamId: "555",
    };

    mockExistsSyncOnce();
    mockReadFileSync(stringify(metadata));
    const zipExport = new AdmZip();
    zipExport.addFile(
      actionFlowFileName,
      Buffer.from(stringify(actionFlowConfig)),
    );

    mockAxiosGet(
      `https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/export/assets`,
      zipExport.toBuffer(),
    );
    await new ActionFlowCommandService(testContext).exportActionFlows(
      packageId,
      ActionFlowService.METADATA_FILE_NAME,
    );

    expect(loggingTestTransport.logMessages.length).toBe(1);
    const expectedZipFileName =
      loggingTestTransport.logMessages[0].message.split(
        FileService.fileDownloadedMessage,
      )[1];
    expect(fs.openSync).toHaveBeenCalledWith(
      expectedZipFileName,
      expect.anything(),
      expect.anything(),
    );
    expect(mockWriteSync).toHaveBeenCalled();

    const fileBuffer = mockWriteSync.mock.calls[0][1];
    const receivedZip = new AdmZip(fileBuffer);

    expect(receivedZip.getEntries().length).toBe(2);
    expect(
      receivedZip
        .getEntries()
        .filter(entry => entry.name === ActionFlowService.METADATA_FILE_NAME)
        .length,
    ).toBe(1);

    const receivedMetadataZipEntry = receivedZip
      .getEntries()
      .filter(entry => entry.name === ActionFlowService.METADATA_FILE_NAME)[0];
    const receivedActionFlowZipEntry = receivedZip
      .getEntries()
      .filter(entry => entry.name !== ActionFlowService.METADATA_FILE_NAME)[0];
    const receivedMetadataFile = parse(
      receivedMetadataZipEntry.getData().toString(),
    );
    const receivedActionFlowFile = parse(
      receivedActionFlowZipEntry.getData().toString(),
    );

    expect(receivedActionFlowZipEntry.name).toEqual(actionFlowFileName);
    expect(receivedActionFlowFile).toEqual(actionFlowConfig);
    expect(receivedMetadataFile).toEqual(metadata);
  });

  it("Should throw error if metadata files does not exist", async () => {
    const zipExport = new AdmZip();
    zipExport.addFile(
      actionFlowFileName,
      Buffer.from(stringify(actionFlowConfig)),
    );

    mockAxiosGet(
      `https://myTeam.celonis.cloud/ems-automation/api/root/${packageId}/export/assets`,
      zipExport.toBuffer(),
    );

    const error = new Error("mock exit");
    jest.spyOn(process, "exit").mockImplementation(() => {
      throw error;
    });

    try {
      await new ActionFlowCommandService(testContext).exportActionFlows(
        packageId,
        ActionFlowService.METADATA_FILE_NAME,
      );
    } catch (e) {
      expect(e).toBe(error);
      expect(process.exit).toHaveBeenCalledWith(1);
    }
  });
});
