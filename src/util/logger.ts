import * as winston from "winston";
import * as Transport from "winston-transport";
import { Logger } from "winston";
import os = require("os");
import * as path from "path";
import * as fs from "fs";

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

// log into the same directory as where the profiles are, to avoid creating more 
// directories for now. Consider changing this to a general 'home' directory such 
// as .celonis-cli or alike.
const logDirName = ".celonis-content-cli-profiles";
const logFileName = 'celonis-cli.log';
const exceptionLogFileName = 'exceptions.log';
const maxLogSizeMB = 3;
const logDir = path.join(os.homedir(), logDirName);
const logFilePath = path.join(logDir, logFileName);
const exceptionLogFilePath = path.join(logDir, exceptionLogFileName);
const maxSizeBytes = maxLogSizeMB * 1024 * 1024; // 3 MB in bytes

// --- Ensure log directory exists ---
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (error) {
    console.error(`Error creating log directory: ${logDir}`, error);
}

export const logger: Logger = winston.createLogger({
    format: winston.format.combine(winston.format.cli()),
    level: 'debug',
    transports: [
        new winston.transports.Console({
            level: 'info', 
            format: winston.format.combine(
                winston.format.colorize(), 
                winston.format.cli()
            ),
        }),
        new winston.transports.File({
            level: 'info', // Log everything from debug up to the file
            filename: logFilePath,
            format: winston.format.combine(
                winston.format.timestamp(), // Add timestamp to file logs
                winston.format.errors({ stack: true }), // Log stack traces
                winston.format.json()      // Log in JSON format
            ),
            maxsize: maxSizeBytes, 
            maxFiles: 5, 
            tailable: true, 
        }),
        new CustomTransport({})
    ],
    exceptionHandlers: [
        new winston.transports.Console({
            format: winston.format.combine(
               winston.format.colorize(),
               winston.format.cli()
           ),
        }), 
        new winston.transports.File({
            filename: exceptionLogFilePath, // Separate file recommended
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
             maxsize: maxSizeBytes,
             maxFiles: 2, // Keep fewer exception logs if desired
             tailable: true,
        }),
        new CustomTransport({})
    ],
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
