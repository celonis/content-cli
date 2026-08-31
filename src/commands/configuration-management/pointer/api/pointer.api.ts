import { HttpClient } from "../../../../core/http/http-client";
import { Context } from "../../../../core/command/cli-context";
import { FatalError } from "../../../../core/utils/logger";
import {
    ConflictErrorTransport,
    PackagePointerTransport,
    SetPackagePointerTransport,
} from "../interfaces/pointer.interfaces";

export const BLOCKING_PROBLEMS_ERROR_CODE = "package-pointer-blocking-problems";

const STATUS_NO_CONTENT = 204;
const STATUS_FIRST_ERROR = 400;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;

const AMBIGUOUS_FORBIDDEN_MESSAGE =
    "The package pointer API answered 403 with an empty body. Two causes produce exactly this response and it " +
    "does not distinguish them: the profile may not edit the package, or the 'pacman.live-branch-pointer' " +
    "feature is inactive for the team. Confirm the feature is active before requesting permissions.";

export interface PointerLookup {
    pointer: PackagePointerTransport | null;
    detail?: string;
}

export class PointerApi {
    private readonly httpClient: () => HttpClient;

    constructor(context: Context) {
        this.httpClient = () => context.httpClient;
    }

    public async setPointer(
        packageKey: string,
        transport: SetPackagePointerTransport,
    ): Promise<PackagePointerTransport | null> {
        const { status, data } = await this.httpClient().putStatusAndData(
            PointerApi.pointerUrl(packageKey),
            transport,
        );

        if (status >= STATUS_FIRST_ERROR) {
            PointerApi.fail(status, data, transport.branchPackageKey);
        }

        return PointerApi.hasNoPayload(status, data) ? null : (data as PackagePointerTransport);
    }

    public async getPointer(packageKey: string): Promise<PointerLookup> {
        const { status, data } = await this.httpClient().getStatusAndData(PointerApi.pointerUrl(packageKey));

        if (status === STATUS_NOT_FOUND) {
            return { pointer: null, detail: PointerApi.messageOf(data) };
        }

        if (status >= STATUS_FIRST_ERROR) {
            PointerApi.fail(status, data, packageKey);
        }

        if (PointerApi.hasNoPayload(status, data)) {
            return { pointer: null };
        }

        return { pointer: data as PackagePointerTransport };
    }

    private static pointerUrl(packageKey: string): string {
        return `/pacman/api/core/pointers/packages/${encodeURIComponent(packageKey)}`;
    }

    private static hasNoPayload(status: number, data: unknown): boolean {
        return status === STATUS_NO_CONTENT || data === undefined || data === null || data === "";
    }

    private static fail(status: number, data: unknown, subjectKey: string): never {
        if (status === STATUS_FORBIDDEN) {
            throw new FatalError(AMBIGUOUS_FORBIDDEN_MESSAGE);
        }

        if (status === STATUS_CONFLICT) {
            throw new FatalError(PointerApi.conflictMessage(data, subjectKey));
        }

        throw new FatalError(`Package pointer request failed with status ${status}: ${PointerApi.describe(data)}`);
    }

    private static conflictMessage(data: unknown, subjectKey: string): string {
        const body = (data ?? {}) as ConflictErrorTransport;
        const errorCode = body.details?.[0]?.errorCode;
        const reason = body.message ?? PointerApi.describe(data);
        const head = errorCode ? `${reason} (errorCode: ${errorCode})` : reason;

        if (errorCode !== BLOCKING_PROBLEMS_ERROR_CODE) {
            return head;
        }

        return (
            `${head}\nThe branch has blocking problems, so it cannot be selected as LIVE. ` +
            `Resolve them and retry. To list them, run: ` +
            `content-cli config package validate --packageKey ${subjectKey}`
        );
    }

    private static messageOf(data: unknown): string | undefined {
        const message = (data as { message?: unknown })?.message;
        return typeof message === "string" ? message : undefined;
    }

    private static describe(data: unknown): string {
        if (data === undefined || data === null || data === "") {
            return "no response body";
        }
        return typeof data === "string" ? data : JSON.stringify(data);
    }
}
