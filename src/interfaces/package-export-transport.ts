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