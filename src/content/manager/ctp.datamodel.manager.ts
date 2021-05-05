import { CtpManager } from "./ctp.manager";

export class CtpDataModelManager extends CtpManager {
    private static BASE_URL = "/cpm-ems-migrator/migration/api/ctp";
    private readonly existingPoolId: string;
    private readonly globalPoolName: string;

    constructor(existingPoolId: string, globalPoolName: string) {
        super();
        this.existingPoolId = existingPoolId;
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
                    existingPoolId: this.existingPoolId,
                    globalPoolName: this.globalPoolName,
                }),
            },
        };
    }
}
