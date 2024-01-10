import * as fs from 'fs';
import {setDefaultProfile} from "./utls/context-mock";
import {TestTransport} from "./utls/test-transport";
import {logger} from "../src/util/logger";

// Mock the modules using Jest
jest.mock('axios');
jest.mock('fs');

const mockWriteFileSync = jest.fn();
(fs.writeFileSync as jest.Mock).mockImplementation(mockWriteFileSync);

afterEach(() => {
    mockWriteFileSync.mockClear();
})

beforeAll(() => {
    setDefaultProfile();
})

let testTransport;

beforeEach(() => {
    testTransport = new TestTransport({})
    logger.add(testTransport);
})

export {testTransport, mockWriteFileSync};