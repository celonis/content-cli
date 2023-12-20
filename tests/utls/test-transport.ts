import * as Transport from "winston-transport";
import {LogEntry} from "winston";

export class TestTransport extends Transport {
    public logMessages: LogEntry[] = [];

    constructor(options: any) {
        super(options);
    }

    public log(info: LogEntry, callback: () => void): void {
        this.logMessages.push(info);
        callback();
    }
}