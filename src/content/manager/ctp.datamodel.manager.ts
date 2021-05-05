import { CtpManager } from "./ctp.manager";

export class CtpDataModelManager extends CtpManager {
    private static BASE_URL = "/cpm-ems-migrator/migration/api/ctp";
    private readonly existingPoolId: string;
    private readonly isGlobalPool: boolean;
    private readonly globalPoolName: string;

    constructor(existingPoolId: string, isGlobalPool: boolean, globalPoolName: string) {
        super();
        this.existingPoolId = existingPoolId;
        this.isGlobalPool = isGlobalPool;
        this.globalPoolName = globalPoolName;
    }

    protected getUrl(): string {
        return CtpDataModelManager.BASE_URL;
    }

    protected getBody(): object {
        return {
            formData: {
                file: this.content,
                transport: JSON.stringify({
                    password: this.password,
                    dataSourceId: null,
                    dataPoolId: this.existingPoolId,
                    isGlobalPool: this.existingPoolId != null ? true : this.isGlobalPool,
                    globalPoolName: this.globalPoolName,
                }),
            },
        };
    }
}
