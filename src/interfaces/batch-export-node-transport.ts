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
    packageId: string,
    packageVersion: string;
    variables: ManifestVariable[],
    space: ManifestSpace,
    dependencies: ManifestDependency[]
}

export interface ManifestVariable extends VariablesAssignments{
    dataPoolName?: string,
    dataModelName?: string
}

export interface ManifestSpace {
    spaceName: string,
    spaceIcon: string
}

export interface ManifestDependency {
    id: string;
    key: string;
    name: string;
    version: string;
    rootNodeId: string;
    external: boolean
    draftId: string;
    updateAvailable: boolean;
    deleted: boolean;
}

export interface PackageAndAssetTransport {
    rootNode: ContentNodeTransport,
    nodes: ContentNodeTransport[]
}

export interface SpaceMappingTransport {
    packageKey: string,
    spaceId: string
}