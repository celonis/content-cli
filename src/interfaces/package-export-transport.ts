import {StudioComputeNodeDescriptor} from "./package-manager.interfaces";

export interface DependencyTransport {
    key: string;
    version: string;
}

export interface PackageExportTransport {
    id: string;
    key: string;
    name: string;
    changeDate: string;
    activatedDraftId: string;
    workingDraftId: string;
    flavor: string;
    version: string;
    dependencies: DependencyTransport[];
    spaceId?: string;
    datamodels?: StudioComputeNodeDescriptor[];
}

export interface VariableExportTransport {
    key: string;
    value: object;
    type: string;
    metadata: object;
}

export interface VariableManifestTransport {
    packageKey: string;
    version: string;
    variables?: VariableExportTransport[];
}

export interface PackageKeyAndVersionPair {
    packageKey: string;
    version: string;
}