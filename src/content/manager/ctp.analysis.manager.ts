import { CtpManager } from "./ctp.manager";

export class CtpAnalysisManager extends CtpManager {
    private static BASE_URL = "/process-analytics/import/ctp";

    protected getUrl(): string {
        return CtpAnalysisManager.BASE_URL;
    }
}
