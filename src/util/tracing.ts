import * as crypto from "crypto";

export class TracingUtils {

    public static getTracingHeaders(): { [key: string]: string } {
        return {
            "x-datadog-trace-id": this.getTraceId(),
            "x-datadog-parent-id": this.getParentId(),
            "x-datadog-sampling-priority": "1",
        };
    }

    private static getTraceId(): string {
        return process.env.TRACE_ID || this.generateId();
    }

    private static getParentId(): string {
        return process.env.PARENT_ID || this.generateId();
    }


    private static generateId(): string {
        return crypto.randomBytes(8).toString("hex");
    }
}
