import {StudioComputeNodeDescriptor} from "./package-manager.interfaces";

export interface PackageVersionTransport {
    id: string;
    key: string;
    name: string;
    version: string;
}

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
    version: PackageVersionTransport;
    dependencies: DependencyTransport[];
    spaceId?: string;
    datamodels?: StudioComputeNodeDescriptor[];
}