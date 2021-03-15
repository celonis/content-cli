import { CtpManager } from "./ctp.manager";

export class CtpAnalysisManager extends CtpManager {
    private static BASE_URL = "/process-analytics/import/ctp";

    public getBody(): any {
        return {
            formData: {
                file: this.content,
                password: this.password,
            },
        };
    }

    protected getUrl(): string {
        return CtpAnalysisManager.BASE_URL;
    }
}
