import * as fs from "fs";
import { Readable } from "stream";

export function mockReadFileSync(data: any): void {
  (fs.readFileSync as jest.Mock).mockReturnValue(data);
}

export function mockReadDirSync(data: any): void {
  (fs.readdirSync as jest.Mock).mockReturnValue(data);
}

export function mockCreateReadStream(data: any): void {
  const stream = new Readable();
  stream.push(data);
  stream.push(null);
  (fs.createReadStream as jest.Mock).mockReturnValue(stream);
}

export function mockExistsSync(): void {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
}

export function mockExistsSyncOnce(): void {
  (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
}
