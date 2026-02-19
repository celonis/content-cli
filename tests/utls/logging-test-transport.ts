import * as Transport from "winston-transport";
import {LogEntry} from "winston";

export class LoggingTestTransport extends Transport {
    public logMessages: LogEntry[] = [];

    constructor(options: any) {
        super(options);
    }

    public log(logEntry: LogEntry, callback: () => void): void {
        if (logEntry.level.includes("debug")) {
            callback();
            return;
        }
        this.logMessages.push(logEntry);
        callback();
    }
}
