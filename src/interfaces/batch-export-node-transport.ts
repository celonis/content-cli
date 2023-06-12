import {
    ContentNodeTransport, DataModelTransport,
    PackageDependencyTransport,
    PackageHistoryTransport, StudioDataModelTransport, VariablesAssignments
} from "./package-manager.interfaces";

export interface BatchExportNodeTransport extends ContentNodeTransport {
    workingDraftId: string;
    activatedDraftId: string;
    version?: PackageHistoryTransport;
    dependencies?: PackageDependencyTransport[];
    datamodels?: StudioDataModelTransport[];
    variables?: VariablesAssignments[];
}
