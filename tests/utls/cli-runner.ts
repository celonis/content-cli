import { IModuleConstructor } from "../../src/core/command/module-handler";
import { buildTestProgram } from "./cli-program";

export interface CliRunResult {
    stdout: string;
    stderr: string;
    output: string;
    exitCode: number;
}

const ANSI_PATTERN = /\x1B\[[0-9;]*m/g;
const stripAnsi = (value: string): string => value.replace(ANSI_PATTERN, "");

class ExitSignal extends Error {
    constructor(public readonly code: number) {
        super(`process.exit(${code})`);
    }
}

export async function runCli(args: string[], modules: IModuleConstructor[]): Promise<CliRunResult> {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    const stdoutSpy = jest
        .spyOn(process.stdout, "write")
        .mockImplementation(((chunk: any): boolean => {
            stdout += typeof chunk === "string" ? chunk : chunk.toString();
            return true;
        }) as typeof process.stdout.write);

    const stderrSpy = jest
        .spyOn(process.stderr, "write")
        .mockImplementation(((chunk: any): boolean => {
            stderr += typeof chunk === "string" ? chunk : chunk.toString();
            return true;
        }) as typeof process.stderr.write);

    const exitSpy = jest.spyOn(process, "exit").mockImplementation(((code?: number) => {
        throw new ExitSignal(code ?? 0);
    }) as never);

    const previousExitCode = process.exitCode;
    process.exitCode = 0;

    try {
        const program = buildTestProgram(modules);
        program.exitOverride();
        await program.parseAsync(["node", "content-cli", ...args]);
    } catch (error) {
        if (error instanceof ExitSignal) {
            exitCode = error.code;
        } else if (error && typeof (error as { code?: unknown }).code === "string"
            && (error as { code: string }).code.startsWith("commander.")) {
            exitCode = (error as { exitCode?: number }).exitCode ?? 0;
        } else {
            throw error;
        }
    } finally {
        if (exitCode === 0 && process.exitCode && Number(process.exitCode) !== 0) {
            exitCode = Number(process.exitCode);
        }
        process.exitCode = previousExitCode;
        stdoutSpy.mockRestore();
        stderrSpy.mockRestore();
        exitSpy.mockRestore();
    }

    const cleanStdout = stripAnsi(stdout);
    const cleanStderr = stripAnsi(stderr);
    return {
        stdout: cleanStdout,
        stderr: cleanStderr,
        output: cleanStdout + cleanStderr,
        exitCode,
    };
}
