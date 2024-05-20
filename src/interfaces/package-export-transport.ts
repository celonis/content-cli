import {StudioComputeNodeDescriptor, VariableDefinition, VariablesAssignments} from "./package-manager.interfaces";
import {SpaceTransport} from "./save-space.interface";

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

export interface PackageManifestTransport {
    packageKey: string;
    flavor: string;
    activeVersion: string;
    dependenciesByVersion: Map<string, DependencyTransport[]>;
}

export interface VariableExportTransport {
    key: string;
    value: any;
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

export interface NodeExportTransport {
    key: string;
    parentNodeKey: string;
    name: string;
    type: string;
    exportSerializationType: string;
    serializedContent: string;
    schemaVersion: number;

    spaceId: string;

    invalidContent?: boolean;
    serializedDocument?: Buffer;
}

export interface NodeSerializedContent {
    variables: VariableDefinition[]
}

export interface StudioPackageManifest {
    packageKey: string;
    space: Partial<SpaceTransport>;
    runtimeVariableAssignments: VariablesAssignments[];
}

export interface PackageVersionImport {
    oldVersion: string;
    newVersion: string;
}

export interface PostPackageImportData {
    packageKey: string;
    importedVersions: PackageVersionImport[];
}