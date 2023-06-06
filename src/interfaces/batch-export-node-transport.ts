import {
    ContentNodeTransport,
    PackageDependencyTransport,
    VariablesAssignments
} from "../api/package-manager-api";

export interface BatchExportNodeTransport extends ContentNodeTransport {
    workingDraftId: string;
    activatedDraftId: string;
    dependencies?: PackageDependencyTransport[];
    variables?: VariablesAssignments[];
}
