import {CtpManager} from "./ctp.manager";
import * as FormData from "form-data";
import {Context} from "../../core/command/cli-context";

export class CtpDataModelManager extends CtpManager {
    private static BASE_URL = "/cpm-ems-migrator/migration/api/ctp";
    private readonly existingPoolId: string;
    private readonly globalPoolName: string;

    constructor(context: Context, existingPoolId: string, globalPoolName: string) {
        super(context);
        this.existingPoolId = existingPoolId;
        this.globalPoolName = globalPoolName;
    }

    protected getUrl(): string {
        return CtpDataModelManager.BASE_URL;
    }

    protected getBody(): object {
        const formData = new FormData();
        formData.append("file", this.content);
        formData.append(
            "transport",
            JSON.stringify({
                password: this.password,
                existingPoolId: this.existingPoolId,
                globalPoolName: this.globalPoolName,
            })
        );
        return formData;
    }
}
