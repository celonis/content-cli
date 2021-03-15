import { CtpManager } from "./ctp.manager";

export class CtpDataModelManager extends CtpManager {
    private static BASE_URL = "/cpm-ems-migrator/migration/api/ctp";

    public getBody(): any {
        const form = new FormData();
        form.append("file", this.content);
        form.append("password", this.password);
        return form;
    }

    protected getUrl(): string {
        return CtpDataModelManager.BASE_URL;
    }
}
