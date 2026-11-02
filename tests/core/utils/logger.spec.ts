import * as winston from "winston";
import { logger } from "../../../src/core/utils/logger";

describe("Logger", () => {
    function findConsoleTransport(): winston.transports.ConsoleTransportInstance {
        return logger.transports.find(
            transport => transport instanceof winston.transports.Console
        ) as winston.transports.ConsoleTransportInstance;
    }

    it("writes errors and warnings to stderr, so they stay out of captured command output", () => {
        const consoleTransport = findConsoleTransport() as any;

        expect(consoleTransport.stderrLevels).toEqual({ error: true, warn: true });
    });

    it("writes info to stdout", () => {
        const consoleTransport = findConsoleTransport() as any;

        expect(consoleTransport.stderrLevels.info).toBeUndefined();
    });
});
