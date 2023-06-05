import {
    PackageDependencyTransport,
    VariablesAssignments
} from "../api/package-manager-api";
import {SaveContentNode} from "./save-content-node.interface";

export interface BatchExportNodeTransport extends SaveContentNode {
    workingDraftId: string;
    activatedDraftId: string;
    dependencies?: PackageDependencyTransport[];
    variables?: VariablesAssignments[];
}
