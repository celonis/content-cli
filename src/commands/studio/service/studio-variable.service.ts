import {
  PackageManagerVariableType,
  PackageWithVariableAssignments,
  VariablesAssignments,
} from "../interfaces/package-manager.interfaces";
import { Context } from "../../../core/command/cli-context";
import { PackageApi } from "../api/package-api";
import { StudioVariablesApi } from "../api/studio-variables-api";

export class StudioVariableService {
  private packageApi: PackageApi;
  private variablesApi: StudioVariablesApi;

  constructor(context: Context) {
    this.packageApi = new PackageApi(context);
    this.variablesApi = new StudioVariablesApi(context);
  }

  public async getVariableAssignmentsForNodes(
    type?: PackageManagerVariableType,
  ): Promise<PackageWithVariableAssignments[]> {
    return await this.packageApi.findAllPackagesWithVariableAssignments(type);
  }

  public async assignVariableValues(
    packageKey: string,
    variablesAssignments: VariablesAssignments[],
  ): Promise<void> {
    await this.variablesApi.assignVariableValues(
      packageKey,
      variablesAssignments,
    );
  }
}
