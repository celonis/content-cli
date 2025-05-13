import * as winston from "winston";
import * as Transport from "winston-transport";
import { Logger } from "winston";

class CustomTransport extends Transport {
    constructor(opts: any) {
        super(opts);
    }

    public log(info: any, cb: () => void): void {
        setImmediate(() => {
            this.emit("logged", info);
        });

        cb();
        if (info.error || (info.errno && info.errno !== "__CELGRACEFULERROR")) {
            process.exit(1);
        }
    }
}

export const logger: Logger = winston.createLogger({
    format: winston.format.combine(winston.format.cli()),
    transports: [new winston.transports.Console(), new CustomTransport({})],
    exceptionHandlers: [new winston.transports.Console(), new CustomTransport({})],
    exitOnError: true,
});

// tslint:disable-next-line: max-classes-per-file
export class FatalError extends Error {
    public error = "FatalError";
}

// By default the logger will process.exit(1) when logging an uncaught fatal error
// This interface allows us to throw errors that do not force the process to exit and can be handled gracefully
// tslint:disable-next-line: max-classes-per-file
export class GracefulError extends Error {
    public code: "__CELGRACEFULERROR";
}