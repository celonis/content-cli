import fs = require("fs");

export function mockReadDirSync(data: any): void {
    jest.spyOn(fs, "readdirSync").mockReturnValue(data);
}
