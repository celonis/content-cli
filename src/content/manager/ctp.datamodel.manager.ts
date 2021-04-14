import { CtpManager } from "./ctp.manager";

export class CtpDataModelManager extends CtpManager {
    private static BASE_URL = "/cpm-ems-migrator/migration/api/ctp";

    protected getUrl(): string {
        return CtpDataModelManager.BASE_URL;
    }
}
