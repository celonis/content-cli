import { logger } from "./logger";
import { contextService } from "../services/context.service";
import { program } from "./program";

export class ContextInitializer {
    public static async initContext(): Promise<void> {
        const options = program.parseOptions(process.argv);
        const pOptionIndex = options.unknown.indexOf("-p");
        const indexOfProfileOption = pOptionIndex !== -1 ? pOptionIndex : options.unknown.indexOf("--profile");

        process.on("unhandledRejection", (e, promise) => {
            logger.error(e.toString());
        });

        await contextService.resolveProfile(options.unknown[indexOfProfileOption + 1]);
    }
}
