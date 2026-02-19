import {
    ContentNodeTransport,
    PackageDependencyTransport,
    PackageHistoryTransport,
    StudioComputeNodeDescriptor,
    VariablesAssignments,
} from "./package-manager.interfaces";
import {SpaceTransport} from "./space.interface";

export interface BatchExportNodeTransport extends ContentNodeTransport {
    workingDraftId: string;
    activatedDraftId: string;
    version?: PackageHistoryTransport;
    dependencies?: PackageDependencyTransport[];
    datamodels?: StudioComputeNodeDescriptor[];
    variables?: VariablesAssignments[];
    space?: SpaceTransport;
}
