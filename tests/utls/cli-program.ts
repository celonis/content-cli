import { Command } from "commander";
import { createProgram } from "../../src/content-cli";
import { IModuleConstructor } from "../../src/core/command/module-handler";
import { testContext } from "./test-context";

export function buildTestProgram(modules: IModuleConstructor[]): Command {
    return createProgram(testContext, { modules });
}
