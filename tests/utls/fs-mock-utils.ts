import fs = require("node:fs");

let readdirSyncSpy: jest.SpyInstance | undefined;

export function mockReadDirSync(data: any): void {
    readdirSyncSpy = jest.spyOn(fs, "readdirSync").mockReturnValue(data);
}

afterEach(() => {
    readdirSyncSpy?.mockRestore();
    readdirSyncSpy = undefined;
});
