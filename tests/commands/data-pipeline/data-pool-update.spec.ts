import { mockAxiosPut, mockAxiosPutError, mockedAxiosInstance, mockedPostRequestBodyByUrl } from "../../utls/http-requests-mock";
import { DataPoolCommandService } from "../../../src/commands/data-pipeline/data-pool/data-pool-command.service";
import { testContext } from "../../utls/test-context";
import { loggingTestTransport } from "../../jest.setup";
import { writeJsonTempFile } from "../../utls/fs-utils";

describe("Update data pool", () => {

    const poolId = "pool-1";
    const updateUrl = `https://myTeam.celonis.cloud/integration/api/pools/${poolId}`;
    const file = "data-pool-update.json";

    const dataPool = {
        id: poolId,
        name: "Updated Pool",
        objects: [],
    };

    beforeEach(() => {
        writeJsonTempFile(file, { dataPool });
    });

    it("Should call the update API and log success", async () => {
        mockAxiosPut(updateUrl, dataPool);

        await new DataPoolCommandService(testContext).updateDataPool(poolId, file);

        expect(mockedAxiosInstance.put).toHaveBeenCalledWith(updateUrl, expect.anything(), expect.anything());
        expect(loggingTestTransport.logMessages).toHaveLength(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Data Pool was updated successfully!");
    });

    it("Should send the data pool from the file as request body", async () => {
        mockAxiosPut(updateUrl, dataPool);

        await new DataPoolCommandService(testContext).updateDataPool(poolId, file);

        expect(JSON.parse(mockedPostRequestBodyByUrl.get(updateUrl))).toEqual(dataPool);
    });

    it("Should log a fatal error and reject when the update API fails", async () => {
        const exitSpy = jest.spyOn(process, "exit").mockImplementation((() => undefined) as never);
        mockAxiosPutError(updateUrl, 500, { message: "Internal Server Error" });

        await expect(new DataPoolCommandService(testContext).updateDataPool(poolId, file)).rejects.toBeUndefined();

        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(loggingTestTransport.logMessages[0].message).toContain("Internal Server Error");

        exitSpy.mockRestore();
    });
});
