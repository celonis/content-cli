import {
    ContentNodeTransport, DataModelTransport,
    PackageDependencyTransport,
    PackageHistoryTransport, StudioDataModelTransport, VariablesAssignments
} from "./package-manager.interfaces";
import {SpaceExportTransport} from "./save-space.interface";

export interface BatchExportNodeTransport extends ContentNodeTransport {
    workingDraftId: string;
    activatedDraftId: string;
    version?: PackageHistoryTransport;
    dependencies?: PackageDependencyTransport[];
    datamodels?: StudioDataModelTransport[];
    variables?: VariablesAssignments[];
    space?: SpaceExportTransport;
}

export interface ManifestNodeTransport {
    packageKey: string;
    variables: ManifestVariable[],
    space: ManifestSpace,
    dependencies: ManifestDependency[]
}

export interface ManifestVariable {
    variableName: string,
    dataPoolName: string,
    dataModelName: string
}

export interface ManifestSpace {
    spaceName: string,
    spaceIcon: string
}

export interface ManifestDependency {
    packageKey: string,
    version: string
}
