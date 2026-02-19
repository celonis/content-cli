import { CtpManager } from "./ctp.manager";
import * as FormData from "form-data";
import { Context } from "../../core/command/cli-context";

export class CtpAnalysisManager extends CtpManager {
  private static BASE_URL = "/process-analytics/import/ctp";

  constructor(context: Context) {
    super(context);
  }

  protected getUrl(): string {
    return CtpAnalysisManager.BASE_URL;
  }

  public getBody(): any {
    const formData = new FormData();
    formData.append("file", this.content);
    formData.append("password", this.password);
    formData.append("spaceId", this.spaceKey);
    return formData;
  }
}
