import {
    ContentNodeTransport, DataModelTransport,
    PackageDependencyTransport, PackageHistoryTransport,
    VariablesAssignments
} from "../api/package-manager-api";

export interface BatchExportNodeTransport extends ContentNodeTransport {
    workingDraftId: string;
    activatedDraftId: string;
    version?: PackageHistoryTransport;
    dependencies?: PackageDependencyTransport[];
    datamodels?: DataModelTransport[];
    variables?: VariablesAssignments[];
}
